import { byteArrayToString } from "@staratlas/data-source";
import { Starbase } from "@staratlas/sage";
import inquirer from "inquirer";
import { starbasesInfo } from "../../common/constants";
import { SageCrafting } from "../../src/SageCrafting";

export const setCraftingStarbase = async (
  crafting: SageCrafting,
  text: string
) => {
  const indexMap = new Map(starbasesInfo.map((item, index) => [item.name, index]));
  const starbases = crafting.getSageGame().getStarbases().map((starbase) => {
    const prettyName = crafting.getSageGame().getStarbasePrettyName(starbase);
    return {
      prettyName,
      data: starbase,
    }
  }).sort((a, b) => {
    const indexA = indexMap.get(a.prettyName) || indexMap.size;
    const indexB = indexMap.get(b.prettyName) || indexMap.size;

    return indexA - indexB;
  });

  const { starbase } = await inquirer.prompt<{ starbase: Starbase }>([
    {
      type: "list",
      name: "starbase",
      message: text,
      choices: starbases.map((starbase) => ({
        name: `${starbase.prettyName} - ${byteArrayToString(starbase.data.data.name)}`,
        value: starbase.data,
      }))
    },
  ]);

  return { type: "Success" as const, data: starbase };
};
