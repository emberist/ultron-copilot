import inquirer from "inquirer";
import { activites } from "../../common/constants";

export const setActivityV2 = async (): Promise<string> => {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "activity",
      message: "Choose which activity you want to start:",
      choices: activites,
    },
  ]);

  const activity = answer.activity;

  return activity;
};
