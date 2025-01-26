#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
// Configure CLI options
commander_1.program
    .name('deploy')
    .description('Deploy the Movie Graph infrastructure')
    .option('-s, --stage <stage>', 'Deployment stage (dev, staging, prod)')
    .option('-a, --account <account>', 'AWS account ID')
    .option('-r, --region <region>', 'AWS region')
    .option('-y, --yes', 'Skip confirmation prompts')
    .parse(process.argv);
const opts = commander_1.program.opts();
async function promptForMissingOptions(options) {
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
            validate: (input) => /^\d{12}$/.test(input) || 'Please enter a valid 12-digit AWS account ID'
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
    const answers = questions.length > 0 ? await inquirer_1.default.prompt(questions) : {};
    return {
        stage: options.stage || answers.stage,
        account: options.account || answers.account,
        region: options.region || answers.region,
        skipPrompts: options.skipPrompts || false
    };
}
async function confirmDeployment(options) {
    if (options.skipPrompts)
        return true;
    const domain = options.stage === 'prod'
        ? 'movie-graph.gabetimm.me'
        : `movie-graph-${options.stage}.gabetimm.me`;
    console.log('\nDeployment Configuration:');
    console.log(chalk_1.default.blue('Stage:    '), chalk_1.default.green(options.stage));
    console.log(chalk_1.default.blue('Account:  '), chalk_1.default.green(options.account));
    console.log(chalk_1.default.blue('Region:   '), chalk_1.default.green(options.region));
    console.log(chalk_1.default.blue('Domain:   '), chalk_1.default.green(domain));
    const { confirm } = await inquirer_1.default.prompt([
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
            console.log(chalk_1.default.yellow('\nDeployment cancelled'));
            process.exit(0);
        }
        // Set environment variables
        process.env.STAGE = options.stage;
        process.env.CDK_DEFAULT_ACCOUNT = options.account;
        process.env.CDK_DEFAULT_REGION = options.region;
        console.log(chalk_1.default.blue('\nStarting deployment...'));
        // Run CDK deploy
        (0, child_process_1.execSync)('pnpm cdk deploy --all', {
            stdio: 'inherit',
            env: {
                ...process.env,
                JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION: '1'
            }
        });
        console.log(chalk_1.default.green('\nDeployment completed successfully!'));
    }
    catch (error) {
        console.error(chalk_1.default.red('\nDeployment failed:'), error);
        process.exit(1);
    }
}
deploy();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc2NyaXB0cy9kZXBsb3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0EsaURBQXlDO0FBQ3pDLHlDQUFvQztBQUNwQyx3REFBZ0M7QUFDaEMsa0RBQTBCO0FBUzFCLHdCQUF3QjtBQUN4QixtQkFBTztLQUNKLElBQUksQ0FBQyxRQUFRLENBQUM7S0FDZCxXQUFXLENBQUMsdUNBQXVDLENBQUM7S0FDcEQsTUFBTSxDQUFDLHFCQUFxQixFQUFFLHVDQUF1QyxDQUFDO0tBQ3RFLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSxnQkFBZ0IsQ0FBQztLQUNuRCxNQUFNLENBQUMsdUJBQXVCLEVBQUUsWUFBWSxDQUFDO0tBQzdDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsMkJBQTJCLENBQUM7S0FDaEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUV2QixNQUFNLElBQUksR0FBRyxtQkFBTyxDQUFDLElBQUksRUFBRSxDQUFDO0FBRTVCLEtBQUssVUFBVSx1QkFBdUIsQ0FBQyxPQUErQjtJQUNwRSxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFFckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNuQixTQUFTLENBQUMsSUFBSSxDQUFDO1lBQ2IsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsT0FBTztZQUNiLE9BQU8sRUFBRSx1Q0FBdUM7WUFDaEQsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUM7WUFDbkMsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNyQixTQUFTLENBQUMsSUFBSSxDQUFDO1lBQ2IsSUFBSSxFQUFFLE9BQU87WUFDYixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSw4QkFBOEI7WUFDdkMsUUFBUSxFQUFFLENBQUMsS0FBYSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLDhDQUE4QztTQUN0RyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNwQixTQUFTLENBQUMsSUFBSSxDQUFDO1lBQ2IsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSw0Q0FBNEM7WUFDckQsT0FBTyxFQUFFO2dCQUNQLFdBQVc7Z0JBQ1gsV0FBVztnQkFDWCxXQUFXO2dCQUNYLFdBQVc7Z0JBQ1gsV0FBVztnQkFDWCxjQUFjO2dCQUNkLGdCQUFnQjtnQkFDaEIsZ0JBQWdCO2FBQ2pCO1lBQ0QsT0FBTyxFQUFFLFdBQVc7U0FDckIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLGtCQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFN0UsT0FBTztRQUNMLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxLQUFLO1FBQ3JDLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPO1FBQzNDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNO1FBQ3hDLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVyxJQUFJLEtBQUs7S0FDMUMsQ0FBQztBQUNKLENBQUM7QUFFRCxLQUFLLFVBQVUsaUJBQWlCLENBQUMsT0FBc0I7SUFDckQsSUFBSSxPQUFPLENBQUMsV0FBVztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRXJDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLEtBQUssTUFBTTtRQUNyQyxDQUFDLENBQUMseUJBQXlCO1FBQzNCLENBQUMsQ0FBQyxlQUFlLE9BQU8sQ0FBQyxLQUFLLGNBQWMsQ0FBQztJQUUvQyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLGVBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLGVBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDcEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLGVBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLGVBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUUzRCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxrQkFBUSxDQUFDLE1BQU0sQ0FBQztRQUN4QztZQUNFLElBQUksRUFBRSxTQUFTO1lBQ2YsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsNkNBQTZDO1lBQ3RELE9BQU8sRUFBRSxLQUFLO1NBQ2Y7S0FDRixDQUFDLENBQUM7SUFFSCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBRUQsS0FBSyxVQUFVLE1BQU07SUFDbkIsSUFBSSxDQUFDO1FBQ0gseUJBQXlCO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7WUFDNUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHO1NBQ3RCLENBQUMsQ0FBQztRQUVILHFCQUFxQjtRQUNyQixNQUFNLFNBQVMsR0FBRyxNQUFNLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7WUFDcEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUVoRCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDO1FBRXBELGlCQUFpQjtRQUNqQixJQUFBLHdCQUFRLEVBQUMsdUJBQXVCLEVBQUU7WUFDaEMsS0FBSyxFQUFFLFNBQVM7WUFDaEIsR0FBRyxFQUFFO2dCQUNILEdBQUcsT0FBTyxDQUFDLEdBQUc7Z0JBQ2QsMENBQTBDLEVBQUUsR0FBRzthQUNoRDtTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGVBQUssQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgcHJvZ3JhbSB9IGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgaW5xdWlyZXIgZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuaW50ZXJmYWNlIERlcGxveU9wdGlvbnMge1xuICBzdGFnZTogc3RyaW5nO1xuICBhY2NvdW50OiBzdHJpbmc7XG4gIHJlZ2lvbjogc3RyaW5nO1xuICBza2lwUHJvbXB0cz86IGJvb2xlYW47XG59XG5cbi8vIENvbmZpZ3VyZSBDTEkgb3B0aW9uc1xucHJvZ3JhbVxuICAubmFtZSgnZGVwbG95JylcbiAgLmRlc2NyaXB0aW9uKCdEZXBsb3kgdGhlIE1vdmllIEdyYXBoIGluZnJhc3RydWN0dXJlJylcbiAgLm9wdGlvbignLXMsIC0tc3RhZ2UgPHN0YWdlPicsICdEZXBsb3ltZW50IHN0YWdlIChkZXYsIHN0YWdpbmcsIHByb2QpJylcbiAgLm9wdGlvbignLWEsIC0tYWNjb3VudCA8YWNjb3VudD4nLCAnQVdTIGFjY291bnQgSUQnKVxuICAub3B0aW9uKCctciwgLS1yZWdpb24gPHJlZ2lvbj4nLCAnQVdTIHJlZ2lvbicpXG4gIC5vcHRpb24oJy15LCAtLXllcycsICdTa2lwIGNvbmZpcm1hdGlvbiBwcm9tcHRzJylcbiAgLnBhcnNlKHByb2Nlc3MuYXJndik7XG5cbmNvbnN0IG9wdHMgPSBwcm9ncmFtLm9wdHMoKTtcblxuYXN5bmMgZnVuY3Rpb24gcHJvbXB0Rm9yTWlzc2luZ09wdGlvbnMob3B0aW9uczogUGFydGlhbDxEZXBsb3lPcHRpb25zPik6IFByb21pc2U8RGVwbG95T3B0aW9ucz4ge1xuICBjb25zdCBxdWVzdGlvbnMgPSBbXTtcbiAgXG4gIGlmICghb3B0aW9ucy5zdGFnZSkge1xuICAgIHF1ZXN0aW9ucy5wdXNoKHtcbiAgICAgIHR5cGU6ICdsaXN0JyxcbiAgICAgIG5hbWU6ICdzdGFnZScsXG4gICAgICBtZXNzYWdlOiAnV2hpY2ggc3RhZ2UgZG8geW91IHdhbnQgdG8gZGVwbG95IHRvPycsXG4gICAgICBjaG9pY2VzOiBbJ2RldicsICdzdGFnaW5nJywgJ3Byb2QnXSxcbiAgICAgIGRlZmF1bHQ6ICdkZXYnXG4gICAgfSk7XG4gIH1cblxuICBpZiAoIW9wdGlvbnMuYWNjb3VudCkge1xuICAgIHF1ZXN0aW9ucy5wdXNoKHtcbiAgICAgIHR5cGU6ICdpbnB1dCcsXG4gICAgICBuYW1lOiAnYWNjb3VudCcsXG4gICAgICBtZXNzYWdlOiAnV2hhdCBpcyB5b3VyIEFXUyBhY2NvdW50IElEPycsXG4gICAgICB2YWxpZGF0ZTogKGlucHV0OiBzdHJpbmcpID0+IC9eXFxkezEyfSQvLnRlc3QoaW5wdXQpIHx8ICdQbGVhc2UgZW50ZXIgYSB2YWxpZCAxMi1kaWdpdCBBV1MgYWNjb3VudCBJRCdcbiAgICB9KTtcbiAgfVxuXG4gIGlmICghb3B0aW9ucy5yZWdpb24pIHtcbiAgICBxdWVzdGlvbnMucHVzaCh7XG4gICAgICB0eXBlOiAnbGlzdCcsXG4gICAgICBuYW1lOiAncmVnaW9uJyxcbiAgICAgIG1lc3NhZ2U6ICdXaGljaCBBV1MgcmVnaW9uIGRvIHlvdSB3YW50IHRvIGRlcGxveSB0bz8nLFxuICAgICAgY2hvaWNlczogW1xuICAgICAgICAndXMtZWFzdC0xJyxcbiAgICAgICAgJ3VzLWVhc3QtMicsXG4gICAgICAgICd1cy13ZXN0LTEnLFxuICAgICAgICAndXMtd2VzdC0yJyxcbiAgICAgICAgJ2V1LXdlc3QtMScsXG4gICAgICAgICdldS1jZW50cmFsLTEnLFxuICAgICAgICAnYXAtc291dGhlYXN0LTEnLFxuICAgICAgICAnYXAtc291dGhlYXN0LTInXG4gICAgICBdLFxuICAgICAgZGVmYXVsdDogJ3VzLWVhc3QtMSdcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGFuc3dlcnMgPSBxdWVzdGlvbnMubGVuZ3RoID4gMCA/IGF3YWl0IGlucXVpcmVyLnByb21wdChxdWVzdGlvbnMpIDoge307XG5cbiAgcmV0dXJuIHtcbiAgICBzdGFnZTogb3B0aW9ucy5zdGFnZSB8fCBhbnN3ZXJzLnN0YWdlLFxuICAgIGFjY291bnQ6IG9wdGlvbnMuYWNjb3VudCB8fCBhbnN3ZXJzLmFjY291bnQsXG4gICAgcmVnaW9uOiBvcHRpb25zLnJlZ2lvbiB8fCBhbnN3ZXJzLnJlZ2lvbixcbiAgICBza2lwUHJvbXB0czogb3B0aW9ucy5za2lwUHJvbXB0cyB8fCBmYWxzZVxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBjb25maXJtRGVwbG95bWVudChvcHRpb25zOiBEZXBsb3lPcHRpb25zKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGlmIChvcHRpb25zLnNraXBQcm9tcHRzKSByZXR1cm4gdHJ1ZTtcblxuICBjb25zdCBkb21haW4gPSBvcHRpb25zLnN0YWdlID09PSAncHJvZCdcbiAgICA/ICdtb3ZpZS1ncmFwaC5nYWJldGltbS5tZSdcbiAgICA6IGBtb3ZpZS1ncmFwaC0ke29wdGlvbnMuc3RhZ2V9LmdhYmV0aW1tLm1lYDtcblxuICBjb25zb2xlLmxvZygnXFxuRGVwbG95bWVudCBDb25maWd1cmF0aW9uOicpO1xuICBjb25zb2xlLmxvZyhjaGFsay5ibHVlKCdTdGFnZTogICAgJyksIGNoYWxrLmdyZWVuKG9wdGlvbnMuc3RhZ2UpKTtcbiAgY29uc29sZS5sb2coY2hhbGsuYmx1ZSgnQWNjb3VudDogICcpLCBjaGFsay5ncmVlbihvcHRpb25zLmFjY291bnQpKTtcbiAgY29uc29sZS5sb2coY2hhbGsuYmx1ZSgnUmVnaW9uOiAgICcpLCBjaGFsay5ncmVlbihvcHRpb25zLnJlZ2lvbikpO1xuICBjb25zb2xlLmxvZyhjaGFsay5ibHVlKCdEb21haW46ICAgJyksIGNoYWxrLmdyZWVuKGRvbWFpbikpO1xuXG4gIGNvbnN0IHsgY29uZmlybSB9ID0gYXdhaXQgaW5xdWlyZXIucHJvbXB0KFtcbiAgICB7XG4gICAgICB0eXBlOiAnY29uZmlybScsXG4gICAgICBuYW1lOiAnY29uZmlybScsXG4gICAgICBtZXNzYWdlOiAnRG8geW91IHdhbnQgdG8gcHJvY2VlZCB3aXRoIHRoZSBkZXBsb3ltZW50PycsXG4gICAgICBkZWZhdWx0OiBmYWxzZVxuICAgIH1cbiAgXSk7XG5cbiAgcmV0dXJuIGNvbmZpcm07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGRlcGxveSgpIHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgZGVwbG95bWVudCBvcHRpb25zXG4gICAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHByb21wdEZvck1pc3NpbmdPcHRpb25zKHtcbiAgICAgIHN0YWdlOiBvcHRzLnN0YWdlLFxuICAgICAgYWNjb3VudDogb3B0cy5hY2NvdW50LFxuICAgICAgcmVnaW9uOiBvcHRzLnJlZ2lvbixcbiAgICAgIHNraXBQcm9tcHRzOiBvcHRzLnllc1xuICAgIH0pO1xuXG4gICAgLy8gQ29uZmlybSBkZXBsb3ltZW50XG4gICAgY29uc3QgY29uZmlybWVkID0gYXdhaXQgY29uZmlybURlcGxveW1lbnQob3B0aW9ucyk7XG4gICAgaWYgKCFjb25maXJtZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvdygnXFxuRGVwbG95bWVudCBjYW5jZWxsZWQnKSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICAgIHByb2Nlc3MuZW52LlNUQUdFID0gb3B0aW9ucy5zdGFnZTtcbiAgICBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5UID0gb3B0aW9ucy5hY2NvdW50O1xuICAgIHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiA9IG9wdGlvbnMucmVnaW9uO1xuXG4gICAgY29uc29sZS5sb2coY2hhbGsuYmx1ZSgnXFxuU3RhcnRpbmcgZGVwbG95bWVudC4uLicpKTtcblxuICAgIC8vIFJ1biBDREsgZGVwbG95XG4gICAgZXhlY1N5bmMoJ3BucG0gY2RrIGRlcGxveSAtLWFsbCcsIHtcbiAgICAgIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgICBlbnY6IHtcbiAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgIEpTSUlfU0lMRU5DRV9XQVJOSU5HX1VOVEVTVEVEX05PREVfVkVSU0lPTjogJzEnXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhjaGFsay5ncmVlbignXFxuRGVwbG95bWVudCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5IScpKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGNoYWxrLnJlZCgnXFxuRGVwbG95bWVudCBmYWlsZWQ6JyksIGVycm9yKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbn1cblxuZGVwbG95KCk7ICJdfQ==