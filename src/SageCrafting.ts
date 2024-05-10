import { getAccount } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@staratlas/anchor";
import { CraftableItem, CraftingFacility, CraftingProcess, Recipe, RecipeInputsOutputs, RecipeStatus } from "@staratlas/crafting";
import { InstructionReturn, readAllFromRPC, readFromRPCOrError } from "@staratlas/data-source";
import { CraftingInstance, Starbase, StarbaseClaimCraftingOutputsInput, StarbaseCloseCraftingProcessInput, StarbaseCreateCraftingProcessInput, StarbaseDepositCraftingIngredientInput, StarbaseStartCraftingProcessInput } from "@staratlas/sage";
import { SageGame } from "./SageGame";
import { SagePlayer } from "./SagePlayer";


export class SageCrafting {

  private player!: SagePlayer;
  private recipes!: Recipe[];

  private constructor(player: SagePlayer) {
    this.player = player;
  }

  static async init(player: SagePlayer): Promise<SageCrafting> {
    const sageCrafting = new SageCrafting(player);

    const [recipes] = await Promise.all([
      sageCrafting.getActiveRecipes()
    ])
    if (recipes.type !== "Success") throw new Error(recipes.type);

    sageCrafting.recipes = recipes.data;

    return sageCrafting;
  }

  getSageGame() {
    return this.player.getSageGame();
  }

  getPlayer() {
    return this.player;
  }

  getRecipes() {
    return this.recipes;
  }

  async getCraftingFacilityAccount(craftingFacilityPubkey: PublicKey) {
    try {
      const craftingFacility = await readFromRPCOrError(
        this.getSageGame().getProvider().connection,
        this.getSageGame().getCraftingProgram(),
        craftingFacilityPubkey,
        CraftingFacility,
        "confirmed"
      );

      return { type: "Success" as const, data: craftingFacility };
    } catch (e) {
      return { type: "CraftingFacilityNotFound" as const };
    }
  }

  private async getActiveRecipes() {
    try {
      const fetchRecipes = await readAllFromRPC(
        this.getSageGame().getProvider().connection,
        this.getSageGame().getCraftingProgram(),
        Recipe,
        "confirmed"
      );

      const recipes = fetchRecipes.flatMap((recipe) =>
        recipe.type === "ok" ? [recipe.data] : []
      );

      const activeRecipes = recipes.filter((recipe) => recipe.data.status === RecipeStatus.Active);

      return { type: "Success" as const, data: activeRecipes };
    } catch (e) {
      return { type: "ActiveRecipesNotFound" as const };
    }
  }

  getRecipeIngredients(recipe: Recipe) {
    const ingredients = recipe.ingredientInputsOutputs;
    let inputs: RecipeInputsOutputs[] = [];
    let outputs: RecipeInputsOutputs[] = [];
    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i];
      if (i < (ingredients.length - recipe.data.outputsCount)) {
        inputs.push(ingredient);
      } else {
        outputs.push(ingredient);
      }
    }
    return { inputs, outputs };
  };

  calculateCraftingDuration(recipe: Recipe, quantity: number, numCrew: number) {
    return CraftingInstance.calculateCraftingDuration(recipe.data.duration, new BN(quantity), new BN(numCrew)).toNumber();
  };

  generateCraftingId() {
    return Math.floor(Math.random() * 999999999);
  }

  private getCraftingProcessAddress(craftingFacilityKey: PublicKey, craftingRecipeKey: PublicKey, craftingId: BN) {
    const [craftingProcess] = CraftingProcess.findAddress(
      this.getSageGame().getCraftingProgram(),
      craftingFacilityKey,
      craftingRecipeKey,
      craftingId,
    );
    return craftingProcess;
  }

  private getCraftingInstanceAddress(starbasePlayerKey: PublicKey, craftingProcessKey: PublicKey) {
    const [craftingInstance] = CraftingInstance.findAddress(
      this.getSageGame().getSageProgram(),
      starbasePlayerKey,
      craftingProcessKey,
    );
    return craftingInstance;
  }

  private getCraftableItemAddress(craftingDomainKey: PublicKey, mint: PublicKey) {
    const [craftableItem] = CraftableItem.findAddress(
      this.getSageGame().getCraftingProgram(),
      craftingDomainKey,
      mint,
    );
    return craftableItem;
  }

  /** SAGE INSTRUCTIONS */

  async ixStartCrafting(
    starbase: Starbase,
    recipe: Recipe,
    quantity: number,
    numCrew: number,
    craftingId: number,
  ) {
    const ixs: InstructionReturn[] = [];

    const starbasePlayerKey = this.player.getStarbasePlayerAddress(starbase);
    const starbasePlayerPod = await this.player.getStarbasePlayerPodAsync(starbase);
    if (starbasePlayerPod.type !== "Success") return starbasePlayerPod;

    const craftingFacility = await this.getCraftingFacilityAccount(starbase.data.craftingFacility);
    if (craftingFacility.type !== "Success") return craftingFacility;

    const recipeCategoryIndex = craftingFacility.data.recipeCategories.findIndex(recipeCategory =>
      recipeCategory.equals(recipe.data.category)
    );

    const createInput = {
      keyIndex: 0,
      numCrew: new BN(numCrew),
      craftingId: new BN(craftingId),
      recipeCategoryIndex: recipeCategoryIndex,
      quantity: new BN(quantity),
    } as StarbaseCreateCraftingProcessInput;

    const ix_0 = CraftingInstance.createCraftingProcess(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getCraftingProgram(),
      this.getSageGame().getAsyncSigner(),
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      starbasePlayerKey,
      starbase.key,
      this.getSageGame().getGame().key,
      this.getSageGame().getGameState().key,
      starbase.data.craftingFacility,
      recipe.key,
      this.getSageGame().getCraftingDomain(),
      createInput
    );
    ixs.push(ix_0);

    const craftingProcessKey = this.getCraftingProcessAddress(
      starbase.data.craftingFacility,
      recipe.key,
      new BN(craftingId)
    );

    const craftingInstanceKey = this.getCraftingInstanceAddress(
      starbasePlayerKey,
      craftingProcessKey
    );

    const inputs = this.getRecipeIngredients(recipe).inputs;
    for (let i = 0; i < inputs.length; i++) {
      const ingredient = inputs[i];
      const amount = quantity * ingredient.amount;

      const ixIngredientAta = this.getSageGame().ixCreateAssociatedTokenAccountIdempotent(craftingProcessKey, ingredient.mint);
      try {
        await getAccount(this.getSageGame().getProvider().connection, ixIngredientAta.address);
      } catch (e) {
        ixs.push(ixIngredientAta.instruction);
      }

      const starbasePodMintAta = this.getSageGame().getAssociatedTokenAddressSync(starbasePlayerPod.data.key, ingredient.mint)

      const depositInput = {
        keyIndex: 0,
        amount: new BN(amount),
        ingredientIndex: i
      } as StarbaseDepositCraftingIngredientInput;

      const ix_deposit = CraftingInstance.depositCraftingIngredient(
        this.getSageGame().getSageProgram(),
        this.getSageGame().getCargoProgram(),
        this.getSageGame().getCraftingProgram(),
        this.getSageGame().getAsyncSigner(),
        this.player.getPlayerProfile().key,
        this.player.getProfileFactionAddress(),
        starbasePlayerKey,
        starbase.key,
        craftingInstanceKey,
        craftingProcessKey,
        starbase.data.craftingFacility,
        recipe.key,
        starbasePlayerPod.data.key,
        this.getSageGame().getCargoTypeKeyByMint(ingredient.mint),
        this.getSageGame().getCargoStatsDefinition().key,
        starbasePodMintAta,
        ixIngredientAta.address,
        this.getSageGame().getGame().key,
        this.getSageGame().getGameState().key,
        depositInput
      );
      ixs.push(ix_deposit);
    }

    const ixAtlasFeeAta = this.getSageGame().ixCreateAssociatedTokenAccountIdempotent(craftingProcessKey, SageGame.ATLAS_KEY);
    try {
      await getAccount(this.getSageGame().getProvider().connection, ixAtlasFeeAta.address);
    } catch (e) {
      ixs.push(ixAtlasFeeAta.instruction);
    }

    const startInput = {
      keyIndex: 0
    } as StarbaseStartCraftingProcessInput;

    const ix_1 = CraftingInstance.startCraftingProcess(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getCraftingProgram(),
      this.getSageGame().getAsyncSigner(),
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      starbasePlayerKey,
      starbase.key,
      craftingInstanceKey,
      craftingProcessKey,
      starbase.data.craftingFacility,
      recipe.key,
      this.getSageGame().getGame().key,
      this.getSageGame().getGameState().key,
      startInput,
      recipe.data.feeRecipient.key,
      this.getSageGame().getAsyncSigner(),
      this.getSageGame().getAtlasFeeAccount(),
      ixAtlasFeeAta.address
    );

    ixs.push(ix_1);
    return { type: "Success" as const, ixs };
  }

  async ixClaimCrafting(
    starbase: Starbase,
    recipe: Recipe,
    craftingId: number,
  ) {
    const ixs: InstructionReturn[] = [];

    const starbasePlayerKey = this.player.getStarbasePlayerAddress(starbase);
    const starbasePlayerPod = await this.player.getStarbasePlayerPodAsync(starbase);
    if (starbasePlayerPod.type !== "Success") return starbasePlayerPod;

    const craftingFacility = await this.getCraftingFacilityAccount(starbase.data.craftingFacility);
    if (craftingFacility.type !== "Success") return craftingFacility;

    const craftingProcessKey = this.getCraftingProcessAddress(
      starbase.data.craftingFacility,
      recipe.key,
      new BN(craftingId)
    );

    const craftingInstanceKey = this.getCraftingInstanceAddress(
      starbasePlayerKey,
      craftingProcessKey
    );

    const inputs = this.getRecipeIngredients(recipe).inputs;
    for (let i = 0; i < inputs.length; i++) {
      const ingredient = inputs[i];

      const ingredientAta = this.getSageGame().getAssociatedTokenAddressSync(craftingProcessKey, ingredient.mint);

      const burnInput = {
        ingredientIndex: i,
      } as StarbaseClaimCraftingOutputsInput;

      const ix_burn = CraftingInstance.burnCraftingConsumables(
        this.getSageGame().getSageProgram(),
        this.getSageGame().getCraftingProgram(),
        starbasePlayerKey,
        starbase.key,
        craftingInstanceKey,
        craftingProcessKey,
        starbase.data.craftingFacility,
        recipe.key,
        this.getSageGame().getGame().key,
        this.getSageGame().getGameState().key,
        ingredientAta,
        ingredient.mint,
        burnInput
      )
      ixs.push(ix_burn);
    }

    const claimInput = {
      ingredientIndex: inputs.length,
    } as StarbaseClaimCraftingOutputsInput;

    const [output] = this.getRecipeIngredients(recipe).outputs;
    const craftableItemKey = this.getCraftableItemAddress(
      this.getSageGame().getCraftingDomain(),
      output.mint
    );

    const craftableItemMintAta = this.getSageGame().getAssociatedTokenAddressSync(craftableItemKey, output.mint);

    const ixOutputAta = this.getSageGame().ixCreateAssociatedTokenAccountIdempotent(starbasePlayerPod.data.key, output.mint);
    try {
      await getAccount(this.getSageGame().getProvider().connection, ixOutputAta.address);
    } catch (e) {
      ixs.push(ixOutputAta.instruction);
    }

    const ix_1 = CraftingInstance.claimCraftingOutputs(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getCargoProgram(),
      this.getSageGame().getCraftingProgram(),
      starbasePlayerKey,
      starbase.key,
      craftingInstanceKey,
      craftingProcessKey,
      starbase.data.craftingFacility,
      recipe.key,
      craftableItemKey,
      starbasePlayerPod.data.key,
      this.getSageGame().getCargoTypeKeyByMint(output.mint),
      this.getSageGame().getCargoStatsDefinition().key,
      this.getSageGame().getGame().key,
      this.getSageGame().getGameState().key,
      craftableItemMintAta,
      ixOutputAta.address,
      claimInput
    );
    ixs.push(ix_1);

    const atlasFeeAta = this.getSageGame().getAssociatedTokenAddressSync(craftingProcessKey, SageGame.ATLAS_KEY);

    const closeInput = {
      keyIndex: 0,
    } as StarbaseCloseCraftingProcessInput;

    const ix_2 = CraftingInstance.closeCraftingProcess(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getCraftingProgram(),
      this.getSageGame().getPointsProgram(),
      this.getSageGame().getAsyncSigner(),
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      "funder",
      starbasePlayerKey,
      starbase.key,
      craftingInstanceKey,
      craftingProcessKey,
      starbase.data.craftingFacility,
      recipe.key,
      this.player.getCraftingXpKey(),
      this.getSageGame().getGamePoints().craftingXpCategory.category,
      this.getSageGame().getGamePoints().craftingXpCategory.modifier,
      this.player.getCouncilRankXpKey(),
      this.getSageGame().getGamePoints().councilRankXpCategory.category,
      this.getSageGame().getGamePoints().councilRankXpCategory.modifier,
      this.getSageGame().getGame().key,
      this.getSageGame().getGameState().key,
      closeInput,
      atlasFeeAta,
      recipe.data.feeRecipient.key
    );
    ixs.push(ix_2);

    return { type: "Success" as const, ixs };
  }

  /** END SAGE INSTRUCTIONS */
}
