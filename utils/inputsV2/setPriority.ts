import inquirer from "inquirer";
import { PriorityLevel, priority } from "../../common/constants";

export const setPriority = async () => {
    return inquirer.prompt<{ priority: PriorityLevel }>([
      {
        type: "list",
        name: "priority",
        message: "Set dynamic priority fee level:",
        choices: priority,
      },
    ]);
  };