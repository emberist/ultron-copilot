import inquirer from "inquirer";
import { PriorityLevel, priorities } from "../../common/constants";

export const setPriority = async () => {
  return process.env.PRIORITY_FEE
    ? { priority: process.env.PRIORITY_FEE as PriorityLevel }
    : inquirer.prompt<{ priority: PriorityLevel }>([
        {
          type: "list",
          name: "priority",
          message: "Set dynamic priority fee level:",
          choices: priorities,
        },
      ]);
};
