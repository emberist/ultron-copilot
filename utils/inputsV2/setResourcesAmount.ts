import inquirer from "inquirer";
import { InputResourcesForCargo } from "../../common/types";
import { ResourceName } from "../../src/SageGame";

const processInput = async (
  input: string
): Promise<InputResourcesForCargo[]> => {
  const resourcePairs = input.split(",");
  const resources: InputResourcesForCargo[] = [];

  for (const pair of resourcePairs) {
    const regex = /(\w+)\s+(\d+|ALL)/i;
    const match = regex.exec(pair.trim());

    if (match) {
      const resource = match[1] as ResourceName;
      if (!ResourceName[resource]) return [];
      const amount =
        match[2].toUpperCase() === "ALL" ? 999999999 : parseInt(match[2], 10);
      resources.push({
        resource: ResourceName[resource],
        amount: amount,
      });
    } else {
      return [];
    }
  }

  return resources;
};

export const setResourcesAmountV2 = async (
  promptMessage: string
): Promise<InputResourcesForCargo[]> => {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "resources",
      message: promptMessage,
      validate: (input) => {
        if (!input) {
          return true;
        }
        return processInput(input).then((processedResources) => {
          if (processedResources.length > 0) {
            return true;
          }
          return "Invalid resources, please try again.";
        });
      },
    },
  ]);

  const resources = answers.resources;
  if (!resources) return [];
  return processInput(resources);
};
