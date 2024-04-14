import inquirer from "inquirer";

export const setCustomPriority = async () => {
    return inquirer.prompt<{ customPriority: number }>([
      {
        type: "input",
        name: "customPriority",
        message: "Set custom priority fee value (< 1000000):",
        default: 0,
        validate: (input: number) => {
            if (isNaN(input)) {
                return "Please enter a number";
            }
            if (input < 0 || input > 1000000) {
                return "Please enter a number between 0 and 1000000";
            }
            return true;
        }
      },
    ]);
  };