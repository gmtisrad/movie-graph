#!/usr/bin/env node
import { execSync } from 'child_process';
import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';

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
  .parse(process.argv);

const opts = program.opts();

async function promptForMissingOptions(options: Partial<DeployOptions>): Promise<DeployOptions> {
  const questions = [];
  
  if (!options.stage) {
    questions.push({
      type: 'list',
      name: 'stage',
      message: 'Which stage do you want to deploy to?',
      choices: ['dev', 'staging', 'prod'],
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
      choices: [
        'us-east-1',
        'us-east-2',
        'us-west-1',
        'us-west-2',
        'eu-west-1',
        'eu-central-1',
        'ap-southeast-1',
        'ap-southeast-2'
      ],
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

async function deploy() {
  try {
    // Get deployment options
    const options = await promptForMissingOptions({
      stage: opts.stage,
      account: opts.account,
      region: opts.region,
      skipPrompts: opts.yes
    });

    // Confirm deployment
    const confirmed = await confirmDeployment(options);
    if (!confirmed) {
      console.log(chalk.yellow('\nDeployment cancelled'));
      process.exit(0);
    }

    // Set environment variables
    process.env.STAGE = options.stage;
    process.env.CDK_DEFAULT_ACCOUNT = options.account;
    process.env.CDK_DEFAULT_REGION = options.region;

    console.log(chalk.blue('\nStarting deployment...'));

    // Run CDK deploy
    execSync('pnpm run cdk deploy --all', {
      stdio: 'inherit',
      env: process.env
    });

    console.log(chalk.green('\nDeployment completed successfully!'));
  } catch (error) {
    console.error(chalk.red('\nDeployment failed:'), error);
    process.exit(1);
  }
}

deploy(); 