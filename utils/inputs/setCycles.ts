import inquirer from "inquirer";

export const setCycles = async (): Promise<number> => {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "cycles",
      message: "How many cycles do you want to run?",
      default: "999999999",
      validate: (input) => {
        if (parseInt(input) && parseInt(input) > 0) return true;
        return "Please input a valid number.";
      },
    },
  ]);

  const cycles = parseInt(answer.cycles);

  return cycles;
};
