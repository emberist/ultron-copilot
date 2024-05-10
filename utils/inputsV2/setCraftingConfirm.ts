import inquirer from "inquirer";
import { SageCrafting } from "../../src/SageCrafting";
import { Recipe } from "@staratlas/crafting";

export const setCraftingConfirm = async (
  recipe: Recipe,
  quantity: number,
  numCrew: number,
  crafting: SageCrafting,
): Promise<string> => {

  const [output] = crafting.getRecipeIngredients(recipe).outputs;
  const resourceName = crafting.getSageGame().getResourcesMintNameByMint(output.mint);
  const duration = crafting.calculateCraftingDuration(recipe, quantity, numCrew);

  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "confirm",
      message: `Are you sure to craft ${quantity} ${resourceName.data?.toString()} using ${numCrew} crew members in ${duration} seconds?`,
      choices: ["Yes", "No"],
    },
  ]);

  const confirm = answer.confirm;

  return confirm;
};
