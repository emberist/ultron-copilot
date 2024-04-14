import inquirer from "inquirer";
import { PlanetType, Sector } from "@staratlas/sage";
import { SageFleet } from "../../src/SageFleet";
import { byteArrayToString } from "@staratlas/data-source";
import { MinableResource } from "../../src/SageGame";

export const setResourceToMine = async (
    fleet: SageFleet,
    sector: Sector
  ) => {
    const planet = fleet.getSageGame().getPlanetsBySector(sector, PlanetType.AsteroidBelt);
    if (planet.type !== "Success") return planet;
    
    const asteroid = planet.data[0]

    const resources = fleet.getSageGame().getResourcesByPlanet(asteroid);
    if (resources.type !== "Success") return resources;

    const minableResources: MinableResource[] = [];

    for (const resource of resources.data) {
        const mineItem = fleet.getSageGame().getMineItemByKey(resource.data.mineItem);
        if (mineItem.type !== "Success") {
            minableResources.length = 0;
            break;
        }

        minableResources.push({
            resource,
            mineItem: mineItem.data
        });
    }

    if (minableResources.length === 0) {
        return { type: "NoMinableResources" as const };
    }

    const { resourceToMine } = await inquirer.prompt<{ resourceToMine: MinableResource }>([
      {
        type: "list",
        name: "resourceToMine",
        message: "Choose the resource to mine:",
        choices: minableResources.map((minableResource) => ({
            name: byteArrayToString(minableResource.mineItem.data.name),
            value: minableResource
        }))
      },
    ]);
  
    return { type: "Success" as const, data: resourceToMine }
  };