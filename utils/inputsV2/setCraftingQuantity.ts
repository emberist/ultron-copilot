import inquirer from "inquirer";

export const setCraftingQuantity = async (
  maxCraftableQuantity: number,
): Promise<number> => {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "quantity",
      message: `Enter quantity to craft (Between 1 and ${maxCraftableQuantity}):`,
      validate: (input) => {
        if (parseInt(input) && parseInt(input) > 0 && parseInt(input) <= maxCraftableQuantity) return true;
        return "Please input a valid number.";
      },
    },
  ]);

  const quantity = parseInt(answer.quantity);

  return quantity;
};
