import inquirer from "inquirer";

export const setNumCrew = async (
  availableCrew: number,
): Promise<number> => {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "numCrew",
      message: `Enter number of crew members (Between 1 and ${availableCrew}):`,
      validate: (input) => {
        if (parseInt(input) && parseInt(input) > 0 && parseInt(input) <= availableCrew) return true;
        return "Please input a valid number.";
      },
    },
  ]);

  const numCrew = parseInt(answer.numCrew);

  return numCrew;
};
