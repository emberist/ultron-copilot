import inquirer from "inquirer";
import { startOptions } from "../../common/constants";

export const setStart = async () => {
  return inquirer.prompt<{ startOption: string }>([
    {
      type: "list",
      name: "startOption",
      message: "Choose an option:",
      choices: startOptions,
    },
  ]);
};
