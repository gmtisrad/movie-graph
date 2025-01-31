#!/usr/bin/env node
import { execSync } from 'child_process';
import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';

// Configuration
const CONFIG = {
  domains: {
    prod: 'movie-graph.gabetimm.me',
    dev: 'movie-graph-dev.gabetimm.me',
    staging: 'movie-graph-staging.gabetimm.me'
  },
  stacks: ['MovieGraphCompute', 'MovieGraphDB', 'MovieGraphVPC'],
  regions: [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-west-2',
    'eu-central-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'sa-east-1'
  ]
};

interface DeployOptions {
  stage: string;
  account: string;
  region: string;
  skipPrompts?: boolean;
}

// Configure CLI options
program
  .name('deploy')
  .description('Deploy the Movie Graph infrastructure')
  .option('-s, --stage <stage>', 'Deployment stage (dev, staging, prod)')
  .option('-a, --account <account>', 'AWS account ID')
  .option('-r, --region <region>', 'AWS region')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--destroy', 'Destroy the infrastructure instead of deploying')
  .option('--force', 'Force destruction without waiting for deletions')
  .parse(process.argv);

const opts = program.opts();

function getEnvironmentVariables(options: DeployOptions) {
  return {
    ...process.env,
    STAGE: options.stage,
    CDK_DEFAULT_ACCOUNT: options.account,
    CDK_DEFAULT_REGION: options.region,
    JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION: '1'
  };
}

async function promptForMissingOptions(options: Partial<DeployOptions>): Promise<DeployOptions> {
  const questions = [];
  
  if (!options.stage) {
    questions.push({
      type: 'list',
      name: 'stage',
      message: 'Which stage do you want to deploy to?',
      choices: Object.keys(CONFIG.domains),
      default: 'dev'
    });
  }

  if (!options.account) {
    questions.push({
      type: 'input',
      name: 'account',
      message: 'What is your AWS account ID?',
      validate: (input: string) => /^\d{12}$/.test(input) || 'Please enter a valid 12-digit AWS account ID'
    });
  }

  if (!options.region) {
    questions.push({
      type: 'list',
      name: 'region',
      message: 'Which AWS region do you want to deploy to?',
      choices: CONFIG.regions,
      default: 'us-east-1'
    });
  }

  const answers = questions.length > 0 ? await inquirer.prompt(questions) : {};

  return {
    stage: options.stage || answers.stage,
    account: options.account || answers.account,
    region: options.region || answers.region,
    skipPrompts: options.skipPrompts || false
  };
}

async function confirmDeployment(options: DeployOptions): Promise<boolean> {
  if (options.skipPrompts) return true;

  const domain = options.stage === 'prod'
    ? 'movie-graph.gabetimm.me'
    : `movie-graph-${options.stage}.gabetimm.me`;

  console.log('\nDeployment Configuration:');
  console.log(chalk.blue('Stage:    '), chalk.green(options.stage));
  console.log(chalk.blue('Account:  '), chalk.green(options.account));
  console.log(chalk.blue('Region:   '), chalk.green(options.region));
  console.log(chalk.blue('Domain:   '), chalk.green(domain));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Do you want to proceed with the deployment?',
      default: false
    }
  ]);

  return confirm;
}

async function confirmDestroy(options: DeployOptions): Promise<boolean> {
  if (options.skipPrompts) return true;

  const domain = options.stage === 'prod'
    ? 'movie-graph.gabetimm.me'
    : `movie-graph-${options.stage}.gabetimm.me`;

  console.log('\nDestroy Configuration:');
  console.log(chalk.red('WARNING: This will destroy all resources in:'));
  console.log(chalk.blue('Stage:    '), chalk.red(options.stage));
  console.log(chalk.blue('Account:  '), chalk.red(options.account));
  console.log(chalk.blue('Region:   '), chalk.red(options.region));
  console.log(chalk.blue('Domain:   '), chalk.red(domain));

  const { confirm } = await inquirer.prompt([
    {
      type: 'input',
      name: 'confirm',
      message: `Type "${options.stage}" to confirm destruction:`,
      validate: (input: string) => input === options.stage || 'Please type the stage name exactly to confirm'
    }
  ]);

  return confirm === options.stage;
}

async function deploy() {
  try {
    // Get deployment options
    const options = await promptForMissingOptions({
      stage: opts.stage,
      account: opts.account,
      region: opts.region,
      skipPrompts: opts.yes
    });

    const envVars = getEnvironmentVariables(options);

    // Handle destroy command
    if (opts.destroy) {
      const confirmed = await confirmDestroy(options);
      if (!confirmed) {
        console.log(chalk.yellow('\nDestruction cancelled'));
        process.exit(0);
      }

      console.log(chalk.red('\nStarting destruction...'));

      // Get stack names for the stage
      const stackNames = CONFIG.stacks.map(stack => `${stack}-${options.stage}`).join(' ');

      // Run CDK destroy
      execSync(`pnpm cdk destroy ${opts.force ? '--force' : ''} ${stackNames}`, {
        stdio: 'inherit',
        env: envVars
      });

      console.log(chalk.green('\nDestruction completed successfully!'));
      return;
    }

    // Confirm deployment
    const confirmed = await confirmDeployment(options);
    if (!confirmed) {
      console.log(chalk.yellow('\nDeployment cancelled'));
      process.exit(0);
    }

    console.log(chalk.blue('\nStarting deployment...'));

    try {
      // Run CDK deploy
      execSync('pnpm cdk deploy --all', {
        stdio: 'inherit',
        env: envVars
      });

      console.log(chalk.green('\nDeployment completed successfully!'));
    } catch (deployError) {
      console.error(chalk.red('\nDeployment failed:'));
      console.error(chalk.red(deployError instanceof Error ? deployError.message : String(deployError)));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\nOperation failed:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

deploy(); 