import { Provider, AnchorProvider, Program, Wallet, BN } from "@staratlas/anchor";
import { Connection, Finality, Keypair, PublicKey, VersionedTransaction, } from "@solana/web3.js";
import { readFromRPCOrError, readAllFromRPC, stringToByteArray, InstructionReturn } from "@staratlas/data-source";
import { PLAYER_PROFILE_IDL, PlayerProfileIDLProgram, } from "@staratlas/player-profile";
import { Fleet, Game, GameState, MineItem, Planet, PlanetType, Points, Resource, SAGE_IDL, SageIDLProgram, Sector, Star, Starbase, SurveyDataUnitTracker, calculateDistance, getCargoPodsByAuthority, sageErrorMap } from "@staratlas/sage";
import { ProfileFactionIDLProgram, PROFILE_FACTION_IDL } from "@staratlas/profile-faction";
import { CargoIDLProgram, CARGO_IDL, CargoStatsDefinition, CargoType } from "@staratlas/cargo";
import { CraftingIDLProgram, CRAFTING_IDL } from "@staratlas/crafting";
import { PlayerProfile } from "@staratlas/player-profile";
import { SectorCoordinates } from "../common/types";
import { AsyncSigner, byteArrayToString, getParsedTokenAccountsByOwner, createAssociatedTokenAccountIdempotent, keypairToAsyncSigner, sendTransaction, buildOptimalDynamicTransactions, TransactionReturn, getSimulationUnits } from "@staratlas/data-source";
import { createBurnInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { CustomPriorityFee, PriorityLevel, PriorityLevelValue, quattrinoTokenPubkey, starbasesInfo } from "../common/constants";
import { PointsIDLProgram, POINTS_IDL, PointsCategory } from "@staratlas/points"

export enum ResourceName {
  Food = "Food",
  Ammo = "Ammo",
  Fuel = "Fuel",
  Tool = "Tool",
  Arco = "Arco",
  Biomass = "Biomass",
  Carbon = "Carbon",
  Diamond = "Diamond",
  Hydrogen = "Hydrogen",
  IronOre = "IronOre",
  CopperOre = "CopperOre",
  Lumanite = "Lumanite",
  Rochinol = "Rochinol",
  Sdu = "Sdu",
  EnergySubstrate = "EnergySubstrate",
  Electromagnet = "Electromagnet",
  Framework = "Framework",
  PowerSource = "PowerSource",
  ParticleAccelerator = "ParticleAccelerator",
  RadiationAbsorber = "RadiationAbsorber",
  SuperConductor = "SuperConductor",
  StrangeEmitter = "StrangeEmitter",
  CrystalLattice = "CrystalLattice",
  CopperWire = "CopperWire",
  Copper = "Copper",
  Electronics = "Electronics",
  Graphene = "Graphene",
  Hydrocarbon = "Hydrocarbon",
  Iron = "Iron",
  Magnet = "Magnet",
  Polymer = "Polymer",
  Steel = "Steel",
}

export type MinableResource = {
  resource: Resource;
  mineItem: MineItem;
}

export class SageGame {
    
    // Sage Programs
    private provider: Provider;
    
    static readonly SAGE_PROGRAM_ID = new PublicKey("SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE");
    static readonly PLAYER_PROFILE_PROGRAM_ID = new PublicKey("pprofELXjL5Kck7Jn5hCpwAL82DpTkSYBENzahVtbc9");
    static readonly PROFILE_FACTION_PROGRAM_ID = new PublicKey("pFACSRuobDmvfMKq1bAzwj27t6d2GJhSCHb1VcfnRmq");
    // static readonly PROFILE_VAULT_PROGRAM_ID = new PublicKey("pv1ttom8tbyh83C1AVh6QH2naGRdVQUVt3HY1Yst5sv");
    static readonly CARGO_PROGRAM_ID = new PublicKey("Cargo2VNTPPTi9c1vq1Jw5d3BWUNr18MjRtSupAghKEk");
    static readonly CRAFTING_PROGRAM_ID = new PublicKey("CRAFT2RPXPJWCEix4WpJST3E7NLf79GTqZUL75wngXo5");
    static readonly POINTS_PROGRAM_ID = new PublicKey("Point2iBvz7j5TMVef8nEgpmz4pDr7tU7v3RjAfkQbM")

    private sageProgram: SageIDLProgram;
    private playerProfileProgram: PlayerProfileIDLProgram;
    private profileFactionProgram: ProfileFactionIDLProgram;
    private cargoProgram: CargoIDLProgram;
    private craftingProgram: CraftingIDLProgram;
    private pointsProgram: PointsIDLProgram;

    private resourcesMint: Record<ResourceName, PublicKey> = {
      [ResourceName.Food]: new PublicKey("foodQJAztMzX1DKpLaiounNe2BDMds5RNuPC6jsNrDG"),
      [ResourceName.Ammo]: new PublicKey("ammoK8AkX2wnebQb35cDAZtTkvsXQbi82cGeTnUvvfK"),
      [ResourceName.Fuel]: new PublicKey("fueL3hBZjLLLJHiFH9cqZoozTG3XQZ53diwFPwbzNim"),
      [ResourceName.Tool]: new PublicKey("tooLsNYLiVqzg8o4m3L2Uetbn62mvMWRqkog6PQeYKL"),
      [ResourceName.Arco]: new PublicKey("ARCoQ9dndpg6wE2rRexzfwgJR3NoWWhpcww3xQcQLukg"),
      [ResourceName.Biomass]: new PublicKey("MASS9GqtJz6ABisAxcUn3FeR4phMqH1XfG6LPKJePog"),
      [ResourceName.Carbon]: new PublicKey("CARBWKWvxEuMcq3MqCxYfi7UoFVpL9c4rsQS99tw6i4X"),
      [ResourceName.Diamond]: new PublicKey("DMNDKqygEN3WXKVrAD4ofkYBc4CKNRhFUbXP4VK7a944"),
      [ResourceName.Hydrogen]: new PublicKey("HYDR4EPHJcDPcaLYUcNCtrXUdt1PnaN4MvE655pevBYp"),
      [ResourceName.IronOre]: new PublicKey("FeorejFjRRAfusN9Fg3WjEZ1dRCf74o6xwT5vDt3R34J"),
      [ResourceName.CopperOre]: new PublicKey("CUore1tNkiubxSwDEtLc3Ybs1xfWLs8uGjyydUYZ25xc"),
      [ResourceName.Lumanite]: new PublicKey("LUMACqD5LaKjs1AeuJYToybasTXoYQ7YkxJEc4jowNj"),
      [ResourceName.Rochinol]: new PublicKey("RCH1Zhg4zcSSQK8rw2s6rDMVsgBEWa4kiv1oLFndrN5"),
      [ResourceName.Sdu]: new PublicKey("SDUsgfSZaDhhZ76U3ZgvtFiXsfnHbf2VrzYxjBZ5YbM"),
      [ResourceName.EnergySubstrate]: new PublicKey("SUBSVX9LYiPrzHeg2bZrqFSDSKkrQkiCesr6SjtdHaX"),
      [ResourceName.Electromagnet]: new PublicKey("EMAGoQSP89CJV5focVjrpEuE4CeqJ4k1DouQW7gUu7yX"),
      [ResourceName.Framework]: new PublicKey("FMWKb7YJA5upZHbu5FjVRRoxdDw2FYFAu284VqUGF9C2"),
      [ResourceName.PowerSource]: new PublicKey("PoWRYJnw3YDSyXgNtN3mQ3TKUMoUSsLAbvE8Ejade3u"),
      [ResourceName.ParticleAccelerator]: new PublicKey("PTCLSWbwZ3mqZqHAporphY2ofio8acsastaHfoP87Dc"),
      [ResourceName.RadiationAbsorber]: new PublicKey("RABSXX6RcqJ1L5qsGY64j91pmbQVbsYRQuw1mmxhxFe"),
      [ResourceName.SuperConductor]: new PublicKey("CoNDDRCNxXAMGscCdejioDzb6XKxSzonbWb36wzSgp5T"),
      [ResourceName.StrangeEmitter]: new PublicKey("EMiTWSLgjDVkBbLFaMcGU6QqFWzX9JX6kqs1UtUjsmJA"),
      [ResourceName.CrystalLattice]: new PublicKey("CRYSNnUd7cZvVfrEVtVNKmXiCPYdZ1S5pM5qG2FDVZHF"),
      [ResourceName.CopperWire]: new PublicKey("cwirGHLB2heKjCeTy4Mbp4M443fU4V7vy2JouvYbZna"),
      [ResourceName.Copper]: new PublicKey("CPPRam7wKuBkYzN5zCffgNU17RKaeMEns4ZD83BqBVNR"),
      [ResourceName.Electronics]: new PublicKey("ELECrjC8m9GxCqcm4XCNpFvkS8fHStAvymS6MJbe3XLZ"),
      [ResourceName.Graphene]: new PublicKey("GRAPHKGoKtXtdPBx17h6fWopdT5tLjfAP8cDJ1SvvDn4"),
      [ResourceName.Hydrocarbon]: new PublicKey("HYCBuSWCJ5ZEyANexU94y1BaBPtAX2kzBgGD2vES2t6M"),
      [ResourceName.Iron]: new PublicKey("ironxrUhTEaBiR9Pgp6hy4qWx6V2FirDoXhsFP25GFP"),
      [ResourceName.Magnet]: new PublicKey("MAGNMDeDJLvGAnriBvzWruZHfXNwWHhxnoNF75AQYM5"),
      [ResourceName.Polymer]: new PublicKey("PoLYs2hbRt5iDibrkPT9e6xWuhSS45yZji5ChgJBvcB"),
      [ResourceName.Steel]: new PublicKey("STEELXLJ8nfJy3P4aNuGxyNRbWPohqHSwxY75NsJRGG"),
    };

    // CHECK: is ! safe here?
    private game!: Game;
    private gameState!: GameState;
    private points!: Points;
    private sectors!: Sector[];
    private stars!: Star[];
    private planets!: Planet[];
    private mineItems!: MineItem[];
    private resources!: Resource[];
    private starbases!: Starbase[];

    private cargoStatsDefinition!: CargoStatsDefinition;
    private pointsCategories!: PointsCategory[];
    private surveyDataUnitTracker!: SurveyDataUnitTracker;
    
    private funder: AsyncSigner;
    private connection!: Connection;
    private customPriorityFee: CustomPriorityFee = { level: PriorityLevel.Custom, value: 0 };

    private constructor(signer: Keypair, connection: Connection, customPriorityFee: CustomPriorityFee) {
        this.connection = connection;
        this.provider = new AnchorProvider(
            connection,
            new Wallet(signer),
            AnchorProvider.defaultOptions()
        );
        this.sageProgram = new Program(
            SAGE_IDL,
            SageGame.SAGE_PROGRAM_ID,
            this.provider
        );
        this.playerProfileProgram = new Program(
            PLAYER_PROFILE_IDL,
            SageGame.PLAYER_PROFILE_PROGRAM_ID,
            this.provider
        );
        this.profileFactionProgram = new Program(
          PROFILE_FACTION_IDL,
          SageGame.PROFILE_FACTION_PROGRAM_ID,
          this.provider
        );
        this.cargoProgram = new Program(
          CARGO_IDL,
          SageGame.CARGO_PROGRAM_ID,
          this.provider
        );
        this.craftingProgram = new Program(
          CRAFTING_IDL,
          SageGame.CRAFTING_PROGRAM_ID,
          this.provider
        );
        this.pointsProgram = new Program(
          POINTS_IDL,
          SageGame.POINTS_PROGRAM_ID,
          this.provider
        );
        this.funder = keypairToAsyncSigner(signer);
        this.customPriorityFee = customPriorityFee;
    }

    static async init(signer: Keypair, connection: Connection, customPriorityFee: CustomPriorityFee): Promise<SageGame> {
      const game = new SageGame(signer, connection, customPriorityFee);
      
      const [gameAndGameState, pointsCategories, cargoStatsDefinition, sectors, stars, planets, mineItems, resources, starbases, surveyDataUnitTracker] = await Promise.all([
        game.getGameAndGameStateAccounts(),
        game.getPointsCategoriesAccount(),
        game.getCargoStatsDefinitionAccount(),
        game.getAllSectorsAccount(),
        game.getAllStarsAccount(),
        game.getAllPlanetsAccount(),
        game.getAllMineItems(),
        game.getAllResources(),
        game.getAllStarbasesAccount(),
        game.getSurveyDataUnitTrackerAccount()
      ]);

      if (gameAndGameState.type === "GameAndGameStateNotFound") throw new Error(gameAndGameState.type);
      if (pointsCategories.type === "PointsCategoriesNotFound") throw new Error(pointsCategories.type);
      if (cargoStatsDefinition.type === "CargoStatsDefinitionNotFound") throw new Error(cargoStatsDefinition.type);
      if (sectors.type === "SectorsNotFound") throw new Error(sectors.type);
      if (stars.type === "StarsNotFound") throw new Error(stars.type);
      if (planets.type === "PlanetsNotFound") throw new Error(planets.type);
      if (mineItems.type === "MineItemsNotFound") throw new Error(mineItems.type);
      if (resources.type === "ResourcesNotFound") throw new Error(resources.type);
      if (starbases.type === "StarbasesNotFound") throw new Error(starbases.type);
      if (surveyDataUnitTracker.type === "SurveyDataUnitTrackerNotFound") throw new Error(surveyDataUnitTracker.type);

      game.game = gameAndGameState.data.game;
      game.gameState = gameAndGameState.data.gameState;
      game.points = gameAndGameState.data.game.data.points;
      game.pointsCategories = pointsCategories.data;
      game.cargoStatsDefinition = cargoStatsDefinition.data;
      game.sectors = sectors.data;
      game.stars = stars.data;
      game.planets = planets.data;
      game.mineItems = mineItems.data;
      game.resources = resources.data;
      game.starbases = starbases.data;
      game.surveyDataUnitTracker = surveyDataUnitTracker.data;

      return game;
    }

    getAsyncSigner() {
      return this.funder;
    }

    getPlayerPublicKey() {
      return this.funder.publicKey();
    }

    getConnection() {
      return this.connection;
    }

    getProvider() {
      return this.provider
    }

    getSageProgram() {
      return this.sageProgram;
    }

    getPlayerProfileProgram() {
      return this.playerProfileProgram;
    }

    getPlayerProfileFactionProgram() {
      return this.profileFactionProgram;
    }

    getCargoProgram() {
      return this.cargoProgram;
    }

    getCraftingProgram() {
      return this.craftingProgram;
    }

    getPointsProgram() {
      return this.pointsProgram;
    }

    getResourcesMint() {
      return this.resourcesMint;
    }

    getResourcesMintNameByMint(mint: PublicKey) {
      for (const [key, publicKey] of Object.entries(this.resourcesMint)) {
        if (publicKey.equals(mint)) {
          return { type: "Success" as const, data: key as ResourceName}
        }
      }
      return { type: "ResourceNotFound" as const };
    }

    /** GAME AND GAME STATE */
    // Game And Game State Accounts - fetch only one per game
    private async getGameAndGameStateAccounts() {
        try {
          const [fetchGame] = await readAllFromRPC(
            this.provider.connection,
            this.sageProgram,
            Game,
            "confirmed",
          );
          
          if (fetchGame.type !== "ok") throw new Error()
          
          const fetchGameStates = await this.getGameStatesAccount();
          if (fetchGameStates.type !== "Success") throw new Error()

          const [gameStateAccount] = fetchGameStates.data.filter((gameState) => fetchGame.data.data.gameState.equals(gameState.key));
          if (!gameStateAccount) throw new Error()

          return { 
            type: "Success" as const, 
            data: {
              game: fetchGame.data,
              gameState: gameStateAccount
            } 
          };
        } catch (e) {
          return { type: "GameAndGameStateNotFound" as const };
        }
    }

    getGame() {
      return this.game;
    }

    getGameState() {
      return this.gameState;
    }

    getGamePoints() {
      return this.points;
    }
    /** END GAME */


    /** GAME STATE */
    // !! Can be more than one game state account per game
    private async getGameStatesAccount() {
        try {
          const fetchGameState = await readAllFromRPC(
            this.provider.connection,
            this.sageProgram,
            GameState,
            "confirmed",
          );

          const gameStates: GameState[] = []
          for (const gameState of fetchGameState) {
            if (gameState.type !== "ok") throw new Error()
            gameStates.push(gameState.data)
          }

          return { type: "Success" as const, data: gameStates };
        } catch (e) {
          return { type: "GameStatesNotFound" as const };
        }
    }
    /** END GAME STATES */


    /** POINTS CATEGORY */
    // All Points Category Account - fetch only one per game
    private async getPointsCategoriesAccount() { // FIX: map accounts to correct PointsCategory in Points type
      try {
        const fetchPointsCategories = await readAllFromRPC(
          this.provider.connection,
          this.pointsProgram,
          PointsCategory,
          "confirmed",
        );

        const pointsCategories: PointsCategory[] = []
        for (const pointsCategory of fetchPointsCategories) {
          if (pointsCategory.type !== "ok") throw new Error()
          pointsCategories.push(pointsCategory.data)
        }

        return { type: "Success" as const, data: pointsCategories };
      } catch (e) {
        return { type: "PointsCategoriesNotFound" as const };
      }
    }

    getPointsCategories() {
      return this.pointsCategories;
    }
    /** END POINTS CATEGORY */


    /** CARGO STATS DEFINITION */
    // cargo Stats Definiton Account - fetch only one per game
    private async getCargoStatsDefinitionAccount() {
      try {
        const [fetchCargoStatsDefinitionAccount] = await readAllFromRPC(
          this.provider.connection,
          this.cargoProgram,
          CargoStatsDefinition,
          "confirmed",
        );

        if (fetchCargoStatsDefinitionAccount.type !== "ok") throw new Error()

        return { type: "Success" as const, data: fetchCargoStatsDefinitionAccount.data };
      } catch (e) {
        return { type: "CargoStatsDefinitionNotFound" as const };
      }
    }

    getCargoStatsDefinition() {
      return this.cargoStatsDefinition;
    }
    /** END CARGO STATS DEFINITION */


    /** SECTORS */
    // All Sectors Account - fetch only one per game
    private async getAllSectorsAccount() {
        try {
          const fetchSectors = await readAllFromRPC(
            this.provider.connection,
            this.sageProgram,
            Sector,
            "confirmed"
          );

          const sectors = fetchSectors.flatMap((sector) =>
            sector.type === "ok" ? [sector.data] : []
          );

          if (sectors.length === 0) throw new Error();

          return { type: "Success" as const, data: sectors };
        } catch (e) {
          return { type: "SectorsNotFound" as const };
        }
    }

    getSectors() {
      return this.sectors;
    }

    async getSectorByCoordsAsync(sectorCoords: SectorCoordinates | [BN,BN]) {
      const [sectorKey] = Sector.findAddress(this.sageProgram, this.game.key, sectorCoords);
      try {
        const sectorAccount = await readFromRPCOrError(
          this.provider.connection,
          this.sageProgram,
          sectorKey,
          Sector,
          "confirmed"
        );
        return { type: "Success" as const, data: sectorAccount };
      } catch (e) {
        return { type: "SectorNotFound" as const };
      }
    }

    async getSectorByKeyAsync(sectorKey: PublicKey) {
      try {
        const sectorAccount = await readFromRPCOrError(
          this.provider.connection,
          this.sageProgram,
          sectorKey,
          Sector,
          "confirmed"
        );
        return { type: "Success" as const, data: sectorAccount };
      } catch (e) {
        return { type: "SectorNotFound" as const };
      }
    }

    getSectorByCoords(sectorCoords: SectorCoordinates | [BN,BN]) {
      const [sectorKey] = Sector.findAddress(this.sageProgram, this.game.key, sectorCoords);
      const [sector] = this.sectors.filter((sector) => sector.key.equals(sectorKey))
      if (sector) {
        return { type: "Success" as const, data: sector }; ;
      } else {
        return { type: "SectorNotFound" as const };
      }
    }

    getSectorByKey(sectorKey: PublicKey) {
      const sector = this.sectors.find((sector) => sector.key.equals(sectorKey))
      if (sector) {
        return { type: "Success" as const, data: sector }; ;
      } else {
        return { type: "SectorNotFound" as const };
      }
    }
    /** END SECTORS */


    /** STARS */
    // All Stars Account - fetch only one per game
    private async getAllStarsAccount() {
      try {
        const fetchStars = await readAllFromRPC(
          this.provider.connection,
          this.sageProgram,
          Star,
          "confirmed"
        );

        const stars = fetchStars.flatMap((star) =>
        star.type === "ok" ? [star.data] : []
        );
        
        if (stars.length === 0) throw new Error();

        return { type: "Success" as const, data: stars };
      } catch (e) {
        return { type: "StarsNotFound" as const };
      }
    }

    getStars() {
      return this.stars;
    }
    /** END STARS */


    /** PLANETS */
    // All Planets Account - fetch only one per game
    private async getAllPlanetsAccount() {
      try {
        const fetchPlanets = await readAllFromRPC(
          this.provider.connection,
          this.sageProgram,
          Planet,
          "confirmed"
        );

        const planets = fetchPlanets.flatMap((planet) =>
        planet.type === "ok" ? [planet.data] : []
        );

        if (planets.length === 0) throw new Error();
        
        return { type: "Success" as const, data: planets };
      } catch (e) {
        return { type: "PlanetsNotFound" as const };
      }
    }

    getPlanets() {
      return this.planets;
    }

    private getPlanetsByCoords(coordinates: SectorCoordinates | [BN,BN], planetType?: PlanetType) {
      return this.planets.filter((planet) => !planetType ? 
        this.bnArraysEqual(planet.data.sector as SectorCoordinates, coordinates) : 
        this.bnArraysEqual(planet.data.sector as SectorCoordinates, coordinates) && planet.data.planetType === planetType);
    }

    getPlanetsBySector(sector: Sector, planetType?: PlanetType) {
      const planets = this.getPlanetsByCoords(sector.data.coordinates as SectorCoordinates, planetType);

      if (planets) {
        return { type: "Success" as const, data: planets };
      } else {
        return { type: "PlanetsNotFound" as const };
      }
    }

    getPlanetByKey(planetKey: PublicKey) {
      const planet = this.planets.find((planet) => planet.key.equals(planetKey))
      if (planet) {
        return { type: "Success" as const, data: planet }; ;
      } else {
        return { type: "PlanetNotFound" as const };
      }
    }
    /** END PLANETS */


    /** STARBASES */
    // All Starbases - fetch only one per game
    private async getAllStarbasesAccount() {
      try {
        const fetchStarbases = await readAllFromRPC(
          this.provider.connection,
          this.sageProgram,
          Starbase,
          "confirmed"
        );

        const starbases = fetchStarbases.flatMap((starbase) =>
        starbase.type === "ok" ? [starbase.data] : []
        );

        if (starbases.length === 0) throw new Error();
        
        return { type: "Success" as const, data: starbases };
      } catch (e) {
        return { type: "StarbasesNotFound" as const };
      }
    }

    getStarbases() {
      return this.starbases;
    }

    getStarbasePrettyName(starbase: Starbase) {
      const starbaseInfo = starbasesInfo;
      const starbaseCoords = starbase.data.sector as SectorCoordinates;
      const [sb] = starbaseInfo.filter((sb) => sb.coords[0].eq(starbaseCoords[0]) && sb.coords[1].eq(starbaseCoords[1]));
      if (!sb) return "";
      return sb.name;
    }

    async getStarbaseBySectorAsync(sector: Sector) {
      try {
        const sectorAccount = await this.getSectorByKeyAsync(sector.key)
        if (sectorAccount.type === "SectorNotFound") return sectorAccount.type;

        const pbk = Starbase.findAddress(this.sageProgram, this.game.key, sectorAccount.data.data.coordinates as [BN, BN])[0];

        const starbaseAccount = await readFromRPCOrError(
          this.provider.connection,
          this.sageProgram,
          pbk,
          Starbase,
          "confirmed"
        );
        return { type: "Success" as const, data: starbaseAccount };
      } catch (e) {
        return { type: "StarbaseNotFound" as const };
      }
    }

    getStarbaseBySector(sector: Sector) {
      const sect = this.sectors.find((sect) => sect.key.equals(sector.key))
      if (sect) {
        const pbk = Starbase.findAddress(this.sageProgram, this.game.key, sect.data.coordinates as [BN, BN])[0];
        const starbase = this.starbases.find((starbase) => starbase.key.equals(pbk))

        if (starbase) {
          return { type: "Success" as const, data: starbase };
        } else {
          return { type: "StarbaseNotFound" as const };
        }
      } else {
        return { type: "SectorNotFound" as const };
      }
    }

    private async getStarbaseByCoordsAsync(starbaseCoords: SectorCoordinates | [BN,BN]) {
      const [starbaseKey] = Starbase.findAddress(this.sageProgram, this.game.key, starbaseCoords)
      try {
        const starbaseAccount = await readFromRPCOrError(
          this.provider.connection,
          this.sageProgram,
          starbaseKey,
          Starbase,
          "confirmed"
        );
        return { type: "Success" as const, data: starbaseAccount };
      } catch (e) {
        return { type: "StarbaseNotFound" as const };
      }
    }

    private async getStarbaseByKeyAsync(starbaseKey: PublicKey) {
      try {
        const starbaseAccount = await readFromRPCOrError(
          this.provider.connection,
          this.sageProgram,
          starbaseKey,
          Starbase,
          "confirmed"
        );
        return { type: "Success" as const, data: starbaseAccount };
      } catch (e) {
        return { type: "StarbaseNotFound" as const };
      }
    }

    getStarbaseByCoords(starbaseCoords: SectorCoordinates | [BN,BN]) {
      const [starbaseKey] = Starbase.findAddress(this.sageProgram, this.game.key, starbaseCoords);
      const starbase = this.starbases.find((starbase) => starbase.key.equals(starbaseKey))
      if (starbase) {
        return { type: "Success" as const, data: starbase }; ;
      } else {
        return { type: "StarbaseNotFound" as const };
      }
    }

    getStarbaseByKey(starbaseKey: PublicKey) {
      const starbase = this.starbases.find((starbase) => starbase.key.equals(starbaseKey))
      if (starbase) {
        return { type: "Success" as const, data: starbase }; ;
      } else {
        return { type: "StarbaseNotFound" as const };
      }
    }
    /** END STARBASES */


    /** MINE ITEMS */
    // Mine Item contains data about a resource in Sage (like hardness)
    // All Mine Items - fetch only one per game
    private async getAllMineItems() {
      try {
        const fetchMineItems = await readAllFromRPC(
          this.provider.connection,
          this.sageProgram,
          MineItem,
          "confirmed"
        );

        const mineItems = fetchMineItems.flatMap((mineItem) =>
        mineItem.type === "ok" ? [mineItem.data] : []
        );

        if (mineItems.length === 0) throw new Error();
        
        return { type: "Success" as const, data: mineItems };
      } catch (e) {
        return { type: "MineItemsNotFound" as const };
      }
    }

    getMineItems() {
      return this.mineItems;
    }

    private async getMineItemByKeyAsync(mineItemKey: PublicKey) { // UNUSED
      try {
          const mineItemAccount = await readFromRPCOrError(
          this.provider.connection,
          this.sageProgram,
          mineItemKey,
          MineItem,
          "confirmed"
          );
      
          return { type: "Success" as const, data: mineItemAccount };
      } catch (e) {
          return { type: "MineItemNotFound" as const };
      }
    }

    getMineItemByKey(mineItemKey: PublicKey) {
      const mineItem = this.mineItems.find((mineItem) => mineItem.key.equals(mineItemKey));
      if (mineItem) {
        return { type: "Success" as const, data: mineItem };
      }
      return { type: "MineItemNotFound" as const };
    }    
    
    getMineItemAddressByMint(mint: PublicKey) {
      const [mineItem] = MineItem.findAddress(this.sageProgram, this.game.key, mint);
      return mineItem;
    }
    /** END MINE ITEMS */


    /** RESOURCES */
    // Resource contains data about a resource in a planet (like richness or mining stats)
    private async getAllResources() {
      try {
        const fetchResources = await readAllFromRPC(
          this.provider.connection,
          this.sageProgram,
          Resource,
          "confirmed"
        );

        const resources = fetchResources.flatMap((resource) =>
        resource.type === "ok" ? [resource.data] : []
        );

        if (resources.length === 0) throw new Error();
        
        return { type: "Success" as const, data: resources };
      } catch (e) {
        return { type: "ResourcesNotFound" as const };
      }
    }

    getResources() {
      return this.resources;
    }

    async getResourceByKeyAsync(resourceKey: PublicKey) {
      try {
          const resourceAccount = await readFromRPCOrError(
          this.provider.connection,
          this.sageProgram,
          resourceKey,
          Resource,
          "confirmed"
          );

          return { type: "Success" as const, data: resourceAccount };
      } catch (e) {
          return { type: "ResourceNotFound" as const };
      }
    }

    getResourceByKey(resourceKey: PublicKey) {
      const resource = this.resources.find((resource) => resource.key.equals(resourceKey));
      if (resource) {
        return { type: "Success" as const, data: resource };
      }
      return { type: "ResourceNotFound" as const };
    } 

    getResourceByMineItemKeyAndPlanetKey(mineItem: PublicKey, planet: PublicKey) {
      const [resourceKey] = Resource.findAddress(this.sageProgram, mineItem, planet);
      const resource = this.getResourceByKey(resourceKey)
      return resource;
    }

    async getResourcesByPlanetAsync(planet: Planet) {
      try {
        const fetchResources = await readAllFromRPC(
          this.provider.connection,
          this.sageProgram,
          Resource,
          "confirmed",
          [
            {
              memcmp: {
                offset: 41,
                bytes: planet.key.toBase58(),
              },
            },
          ]
        );

        const resources = fetchResources.flatMap((resource) =>
          resource.type === "ok" ? [resource.data] : []
        );

        if (resources.length === 0) throw new Error();
        
        return { type: "Success" as const, data: resources };
      } catch (e) {
        return { type: "ResourcesNotFound" as const };
      }
    }

    getResourcesByPlanet(planet: Planet) {
      const resources = this.resources.filter((resource) => resource.data.location.equals(planet.key));
      if (resources.length > 0) {
        return { type: "Success" as const, data: resources };
      }
      return { type: "ResourcesNotFound" as const };
    }

    getResourceName(resource: Resource) {
      const mineItem = this.getMineItemByKey(resource.data.mineItem);
      if (mineItem.type !== "Success") return mineItem;
      return { type: "Success" as const, data: byteArrayToString(mineItem.data.data.name) };
    }
    /** END RESOURCES */


    /** RESOURCES MINT */
    getResourceMintByName(resourceName: ResourceName) {
      return this.resourcesMint[resourceName];
    }

    getMineItemAndResourceByNameAndPlanetKey(resourceName: ResourceName, planetKey: PublicKey) {
      const mint = this.resourcesMint[resourceName];
      return this.getMineItemAndResourceByMintAndPlanetKey(mint, planetKey)
    }

    private getMineItemAndResourceByMintAndPlanetKey(mint: PublicKey, planetKey: PublicKey) {
      const [mineItem] = this.mineItems.filter((mineItem) => mineItem.data.mint.equals(mint));
      const [resource] = this.resources.filter((resource) => resource.data.mineItem.equals(mineItem.key) && resource.data.location.equals(planetKey));

      return { mineItem, resource } as MinableResource;
    }
    /** END RESOURCES MINT */


    /** SURVEY DATA UNIT TRACKER */
    private async getSurveyDataUnitTrackerAccount() {
      try {
        const [fetchSurveyDataUnitTracker] = await readAllFromRPC(
          this.provider.connection,
          this.sageProgram,
          SurveyDataUnitTracker,
          "confirmed",
        );

        if (fetchSurveyDataUnitTracker.type !== "ok") throw new Error()

        return { type: "Success" as const, data: fetchSurveyDataUnitTracker.data };
      } catch (e) {
        return { type: "SurveyDataUnitTrackerNotFound" as const };
      }
    }

    getSuvreyDataUnitTracker() {
      return this.surveyDataUnitTracker;
    }
    /** END SURVEY DATA UNIT TRACKER */


    /** PLAYER PROFILE */
    // Step 1: Get Player Profiles from the player public key
    async getPlayerProfilesAsync() {
      try {  
        const fetchPlayerProfiles = await readAllFromRPC(
          this.getProvider().connection,
          this.getPlayerProfileProgram(),
          PlayerProfile,
          "confirmed",
          [
            {
              memcmp: {
                offset: 30,
                bytes: this.getPlayerPublicKey().toBase58(),
              },
            },
          ]
        );
    
        const playerProfiles = fetchPlayerProfiles.flatMap((playerProfile) =>
        playerProfile.type === "ok" ? [playerProfile.data] : []
        );

        if (playerProfiles.length === 0) throw new Error();

        return { type: "Success" as const, data: playerProfiles };
      } catch (e) {
        return { type: "PlayerProfilesNotFound" as const };
      }
    }

    // Step 2. Get a Player Profile Account
    async getPlayerProfileAsync(playerProfilePublicKey: PublicKey) {
      try {
          const playerProfileAccount = await readFromRPCOrError(
          this.getProvider().connection,
          this.getPlayerProfileProgram(),
          playerProfilePublicKey,
          PlayerProfile,
          "confirmed"
          );
      
          return { type: "Success" as const, data: playerProfileAccount };
      } catch (e) {
          return { type: "PlayerProfileNotFound" as const };
      }
    }
    /** END PLAYER PROFILE */


    /** FLEET */
    getFleetAddressByPlayerProfileAndFleetName(playerProfile: PublicKey, fleetName: string) {
      const fleetLabel = stringToByteArray(fleetName, 32);
      const [fleet] = Fleet.findAddress(
        this.sageProgram,
        this.game.key,
        playerProfile,
        fleetLabel
      );
  
      return fleet;
    }

    async getFleetAccountAsync(fleetPublicKey: PublicKey) {
        try {
          const fleetAccount = await readFromRPCOrError(
            this.provider.connection,
            this.sageProgram,
            fleetPublicKey,
            Fleet,
            "confirmed"
          );
          return { type: "Success" as const, data: fleetAccount };
        } catch (e) {
          return { type: "FleetNotFound" as const };
        }
    }   
    /** END FLEET */

    /** HELPERS */ 
    async getParsedTokenAccountsByOwner(owner: PublicKey) {
      try {
        const data = await getParsedTokenAccountsByOwner(this.provider.connection, owner);
        return { type: "Success" as const, data };
      } catch (e) {
        return { type: "ParsedTokenAccountError" as const };
      }
    }

    ixCreateAssociatedTokenAccountIdempotent(owner: PublicKey, mint: PublicKey) {
      const associatedTokenAccount = createAssociatedTokenAccountIdempotent(
        mint,
        owner,
        true
      );
      const associatedTokenAccountKey = associatedTokenAccount.address;
      const associatedTokenAccountKeyIx = associatedTokenAccount.instructions;

      return { address: associatedTokenAccountKey, instruction: associatedTokenAccountKeyIx };
    }

    async getCargoPodsByAuthority(authority: PublicKey) {
      try {
        const fetchCargoPods = await getCargoPodsByAuthority(
          this.provider.connection,
          this.cargoProgram,
          authority
        );
  
        const cargoPods = fetchCargoPods.flatMap((pod) =>
          pod.type === "ok" ? [pod.data] : []
        );
  
        if (cargoPods.length == 0) return { type: "CargoPodsNotFound" as const };
  
        return { type: "Success" as const, data: cargoPods };
      } catch (e) {
        return { type: "CargoPodsNotFound" as const };
      }
    }

    // !! we can just return the balance (also if the ATA doesn't exist) thanks to createTokenAccountIdempotent instruction
    async getTokenAccountBalance(tokenAccounKey: PublicKey,) {
      try {
        const tokenAccount = await this.connection.getTokenAccountBalance(
          tokenAccounKey,
          'confirmed',
        );
        if (tokenAccount.value.uiAmount == null) {
          //return { type: "TokenAccountShouldBeDefined" as const };
          return 0;
        } else {
          // return { type: "Success" as const, data: tokenAccount.value.uiAmount };
          return tokenAccount.value.uiAmount
        }
      } catch (e) {
        return 0;
      }
    };

    bnArraysEqual(a: BN[], b: BN[]) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!a[i].eq(b[i])) return false;
      }
      return true;
    }

    getCargoTypeKeyByMint(mint: PublicKey) {
      const [cargoType] = CargoType.findAddress(
        this.cargoProgram,
        this.cargoStatsDefinition.key,
        mint,
        this.cargoStatsDefinition.data.seqId
      );
  
      return cargoType;
    }

    async getCargoTypeByMintAsync(mint: PublicKey) {
      const cargoTypeKey = this.getCargoTypeKeyByMint(mint);
      try {
        const cargoTypeAccount = await readFromRPCOrError(
          this.provider.connection,
          this.cargoProgram,
          cargoTypeKey,
          CargoType,
          "confirmed"
        );
        return { type: "Success" as const, data: cargoTypeAccount };
      } catch (e) {
        return { type: "CargoTypeNotFound" as const };
      }
    }

    getCargoTypeByResourceName(resourceName: ResourceName) {
      const mint = this.resourcesMint[resourceName];
      const [cargoType] = CargoType.findAddress(
        this.cargoProgram,
        this.cargoStatsDefinition.key,
        mint,
        this.cargoStatsDefinition.data.seqId
      );
  
      return cargoType;
    }

    private calculateDistanceByCoords(a: SectorCoordinates | [BN,BN], b: SectorCoordinates | [BN,BN]) {
      return calculateDistance(a,b);
    }

    calculateDistanceBySector(a: Sector, b: Sector) {
      return calculateDistance(a.data.coordinates as [BN, BN], b.data.coordinates as [BN, BN]);
    }

    getAssociatedTokenAddressSync(owner: PublicKey, mint: PublicKey) {
      return getAssociatedTokenAddressSync(mint, owner, true)
    }

    delay(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    /** END HELPERS */


    /** TRANSACTIONS */
    ixBurnQuattrinoToken() {
      const fromATA = getAssociatedTokenAddressSync(
        quattrinoTokenPubkey,
        this.funder.publicKey()
      );
  
      const ix = createBurnInstruction(
        fromATA,
        quattrinoTokenPubkey,
        this.funder.publicKey(),
        1
      );
  
      const iws: InstructionReturn = async (funder) => ({
        instruction: ix,
        signers: [funder],
      });
  
      return iws;
    }
  
    async getQuattrinoBalance() {
      const fromATA = getAssociatedTokenAddressSync(
        quattrinoTokenPubkey,
        this.funder.publicKey()
      );
      const tokenBalance = await this.getTokenAccountBalance(fromATA);

      if (tokenBalance === 0) 
        return { type: "NoEnoughTokensToPerformLabsAction" as const };

      return { type: "Success" as const, data: tokenBalance };
    }

    private async buildDynamicTransactions(instructions: InstructionReturn[], fee: boolean) {
      if (fee) {
        const tokenBalance = await this.getQuattrinoBalance();
        if (tokenBalance.type !== "Success") return tokenBalance;
        instructions.push(this.ixBurnQuattrinoToken());
      }

      const getFee = async (writableAccounts: PublicKey[], connection: Connection): Promise<number> => {
        if (this.customPriorityFee.level === PriorityLevel.None) return 0;
        
        const customPriorityFee = 
          this.customPriorityFee.level === PriorityLevel.Default ? PriorityLevelValue.Default :
          this.customPriorityFee.level === PriorityLevel.Low ? PriorityLevelValue.Low :
          this.customPriorityFee.level === PriorityLevel.Medium ? PriorityLevelValue.Medium :
          this.customPriorityFee.level === PriorityLevel.High ? PriorityLevelValue.High :
          (
            this.customPriorityFee.level === PriorityLevel.Custom && 
            this.customPriorityFee.value &&
            this.customPriorityFee.value < PriorityLevelValue.MaxCustom
          ) ? this.customPriorityFee.value : 
          0;

        const rpf = await connection.getRecentPrioritizationFees({ lockedWritableAccounts: writableAccounts})
        const priorityFee = 
          Math.round(rpf.map(item => item.prioritizationFee).reduce((acc, fee) => acc + fee, 0) / rpf.length) + customPriorityFee;
          // console.log("\nPriority Fee:", priorityFee / 1000000, "Lamports per CU");
        return priorityFee;
      };
      
      const getLimit = async (transaction: VersionedTransaction, connection: Connection): Promise<number> => {
        const unitLimit = (await getSimulationUnits(transaction, connection) || 100000) + 1000;
        // console.log("\nUnit Limit:", unitLimit, "CU");
        return unitLimit;
      };

      const txs = await buildOptimalDynamicTransactions(
        this.connection, 
        instructions, 
        this.funder, 
        {
          getFee,
          getLimit,
        }
      )
      if (txs.isErr()) return { type: "BuildOptimalDynamicTransactionsFailed" as const };
      return { type: "Success" as const, data: txs.value };
    }

    /* async sendDynamicTransactions(instructions: InstructionReturn[], fee: boolean) {
      const commitment: Finality = "confirmed";
      let attempts = 0;
      const maxAttempts = 3;
      const txSignatures: string[] = [];
      
      let buildTxs = await this.buildDynamicTransactions(instructions, fee);
      if (buildTxs.type !== "Success") return buildTxs;
      
      let toProcess = buildTxs.data;
    
      while (toProcess.length > 0 && attempts < maxAttempts) {
        const results = await Promise.allSettled(
          toProcess.map(tx => sendTransaction(tx, this.connection, {
            commitment,
            sendOptions: {
              skipPreflight: false,
              preflightCommitment: "confirmed",
            },
          }))
        );
    
        toProcess = [];
    
        console.log(" ");
        results.forEach(async (result, index) => {
          if (result.status === "rejected") {
            let reason;

            const errorCode = result.reason && result.reason.message ? parseInt(result.reason.message.split(" ").pop().trim()) : null;
            if (errorCode && errorCode >= 6000 && result.reason.logs && result.reason.logs.length > 6) {
              const errorMessage: string[] = result.reason.logs[6].split(".");
              reason = errorMessage.slice(1, errorMessage.length - 1).map(item => item.trim()).join(" - ");
            } else {
              const error = result.reason as SolanaJSONRPCError
              reason = error.message[error.message.length - 1];
            }

            console.error(`Transaction #${index} failed on attempt ${attempts + 1} with error: ${reason}`);

            if (buildTxs.type === "Success")
              toProcess.push(buildTxs.data[index]);
          } else if (result.status === "fulfilled" && !result.value.value.isOk()) {
            console.error(`Transaction #${index} completed but not OK, retrying...`);
            
            buildTxs = await this.buildDynamicTransactions(instructions, fee);
            if (buildTxs.type !== "Success") return buildTxs;

            toProcess.push(buildTxs.data[index]);
          } else if (result.status === "fulfilled" && result.value.value.isOk()){
            console.log(`Transaction #${index} completed!`);
            txSignatures.push(result.value.value.value);
          }
        });
    
        attempts++;
        if (toProcess.length > 0) {
          console.log(" ");
          console.log("Waiting 10 seconds before next attempt...");
          await this.delay(10000);
        }
      }
    
      if (txSignatures.length === buildTxs.data.length) {
        return { type: "Success" as const, data: txSignatures };
      } else {
        return { type: "SendTransactionsFailure" as const };
      }
    } */
    
    async buildAndSendDynamicTransactions(instructions: InstructionReturn[], fee: boolean) {
      const COMMITMENT: Finality = "confirmed";
      const MAX_ATTEMPTS = 10;
      const RETRY_DELAY_MS = 10000;
      let attempts = 0;
      const txSignatures: string[] = [];
      
      // Build transactions
      let buildTxs = await this.buildDynamicTransactions(instructions, fee);
      if (buildTxs.type !== "Success") return buildTxs;
      
      let toProcess = buildTxs.data;
    
      while (toProcess.length > 0 && attempts < MAX_ATTEMPTS) {
          // Process transactions
          const results = await this.sendAllTransactions(toProcess, COMMITMENT);

          toProcess = [];

          // Check transactions results
          for (let i = 0; i < results.length; i++) {
              const result = results[i];

              // If transaction failed to send
              if (result.status === "rejected") {
                  const reason = this.parseError(result.reason);
                  console.error(`> Transaction #${i} failed on attempt ${attempts + 1}: ${reason}`);
                  const newBuild = await this.buildDynamicTransactions(instructions, fee);
                  if (newBuild.type === "Success") {
                      toProcess.push(newBuild.data[i]);
                  } else {
                      console.error(`> Failed to rebuild transaction #${i}`);
                  }
              } 
              // If transaction sent, confirmed but not OK
              else if (result.status === "fulfilled" && !result.value.value.isOk()) {
                  console.error(`> Transaction #${i} completed but not OK, rebuilding and retrying...`);
                  const newBuild = await this.buildDynamicTransactions(instructions, fee);
                  if (newBuild.type === "Success") {
                      toProcess.push(newBuild.data[i]);
                  } else {
                      console.error(`> Failed to rebuild transaction #${i}`);
                  }
              } 
              // If transaction sent, confirmed and OK
              else if (result.status === "fulfilled" && result.value.value.isOk()) {
                  console.log(`> Transaction #${i} completed!`);
                  txSignatures.push(result.value.value.value);
              }
    
          }

          attempts++;
          if (toProcess.length > 0 && attempts < MAX_ATTEMPTS) {
              console.log(`\nWaiting ${RETRY_DELAY_MS / 1000} seconds for next attempt...`);
              await this.delay(RETRY_DELAY_MS);
          }
      }
    
      return txSignatures.length === buildTxs.data.length
          ? { type: "Success" as const, data: txSignatures }
          : { type: "SendTransactionsFailure" as const };
    }

    private async sendAllTransactions(transactions: TransactionReturn[], commitment: Finality) {
        return Promise.allSettled(
            transactions.map(tx => sendTransaction(tx, this.connection, { commitment }))
        );
    }

    private parseError(reason: any): string {
        const errorCode = reason ? parseInt(reason.message.split(" ").pop().trim()) : null;
        if (errorCode && errorCode >= 6000/*  && reason.logs && reason.logs.length > 6 */) {
          const [error] = Object.values(sageErrorMap).filter(item => item.code == errorCode);
          return error ? error.msg : reason;
          /* const errorMessage: string[] = reason.logs[6].split(".");
          return errorMessage.slice(1, errorMessage.length - 1).map(item => item.trim()).join(" - "); */
        } else {
          return reason;
        }
    }
    /** END TRANSACTIONS */
    // END CLASS
}