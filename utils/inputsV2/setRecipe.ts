import { Recipe } from "@staratlas/crafting";
import { Starbase } from "@staratlas/sage";
import inquirer from "inquirer";
import { SageCrafting } from "../../src/SageCrafting";

export const setRecipe = async (
  starbase: Starbase,
  crafting: SageCrafting
) => {
  const craftingFacilityKey = starbase.data.craftingFacility;
  const craftingFacility = await crafting.getCraftingFacilityAccount(craftingFacilityKey);
  if (craftingFacility.type !== "Success") return craftingFacility;

  const recipes = crafting.getRecipes();
  const starbaseRecipes = recipes.filter(recipe => craftingFacility.data.recipeCategories.map(pubkey => pubkey.toBase58()).includes(recipe.data.category.toBase58()));

  const { recipe } = await inquirer.prompt<{ recipe: Recipe }>([
    {
      type: "list",
      name: "recipe",
      message: "Choose recipe:",
      choices: starbaseRecipes.map((recipe) => {
        const { inputs, outputs } = crafting.getRecipeIngredients(recipe);
        const inputsText = inputs.map(input => {
          const resourceName = crafting.getSageGame().getResourcesMintNameByMint(input.mint);
          return `${resourceName.data} (${input.amount})`
        }).join(" + ");
        const outputsText = outputs.map(output => {
          const resourceName = crafting.getSageGame().getResourcesMintNameByMint(output.mint);
          return `${resourceName.data}${output.amount > 1 ? " (" + output.amount + ")" : ""}`
        }).join(" + ");
        return ({
          name: `${outputsText} = ${inputsText}`,
          value: recipe,
        })
      }).sort((a, b) => a.name > b.name ? 1 : -1)
    },
  ]);

  return { type: "Success" as const, data: recipe };
};
