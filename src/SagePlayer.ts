import { PublicKey } from "@solana/web3.js";
import { SageGame } from "./SageGame";
import { PlayerProfile } from "@staratlas/player-profile";
import { ProfileFactionAccount } from "@staratlas/profile-faction";
import { readFromRPCOrError, readAllFromRPC } from "@staratlas/data-source";
import { Fleet, SagePlayerProfile, Starbase, StarbasePlayer } from "@staratlas/sage";
import { UserPoints } from "@staratlas/points"

export class SagePlayer {

    private sageGame: SageGame;
    private playerProfile!: PlayerProfile;

    private key: PublicKey;
    private userPoints!: UserPoints[];

    private constructor(sageGame: SageGame, playerProfile: PlayerProfile) {
        this.sageGame = sageGame;
        this.playerProfile = playerProfile;
        this.key = playerProfile.key;
    }

    static async init(sageGame: SageGame, playerProfile: PlayerProfile): Promise<SagePlayer> {
        const player = new SagePlayer(sageGame, playerProfile);

        const [userPoints] = await Promise.all([
          player.getUserPointsAsync()
        ]);

        if (userPoints.type !== "Success") throw new Error(userPoints.type);

        player.userPoints = userPoints.data;

        return player;
    }

    getPlayerProfile() {
      return this.playerProfile;
    }
    
    getSageGame() {
      return this.sageGame;
    }

    getProfileFactionAddress() {
      const [profileFaction] = ProfileFactionAccount.findAddress(
        this.sageGame.getPlayerProfileFactionProgram(),
        this.playerProfile.key
      );
  
      return profileFaction;
    }

    getSagePlayerProfileAddress() { 
      const [sagePlayerProfile] = SagePlayerProfile.findAddress(
        this.sageGame.getSageProgram(),
        this.playerProfile.key,
        this.sageGame.getGame().key
      );
  
      return sagePlayerProfile;
    }

    getStarbasePlayerAddress(
      starbase: Starbase
    ) { 
      const [starbasePlayer] = StarbasePlayer.findAddress(
        this.sageGame.getSageProgram(),
        starbase.key,
        this.getSagePlayerProfileAddress(),
        starbase.data.seqId
      );
  
      return starbasePlayer;
    }

    // Step 3B. Get all fleets owned by a player profile
    async getAllFleetsAsync() {
      try {  
        const fetchFleets = await readAllFromRPC(
          this.sageGame.getProvider().connection,
          this.sageGame.getSageProgram(),
          Fleet,
          "confirmed",
          [
            {
              memcmp: {
                offset: 41,
                bytes: this.playerProfile.key.toBase58(),
              },
            },
          ]
        );
    
        const fleets = fetchFleets.flatMap((fleet) =>
          fleet.type === "ok" ? [fleet.data] : []
        );

        if (fleets.length === 0) throw new Error();

        return { type: "Success" as const, data: fleets };
      } catch (e) {
        return { type: "FleetsNotFound" as const };
      }
    }

    async getFleetByKeyAsync(fleetKey: PublicKey) {
      try {
        const fleetAccount = await readFromRPCOrError(
          this.sageGame.getProvider().connection,
          this.sageGame.getSageProgram(),
          fleetKey,
          Fleet,
          "confirmed"
        );
        return { type: "Success" as const, data: fleetAccount };
      } catch (e) {
        return { type: "FleetNotFound" as const };
      }
    }

    async getStarbasePlayerByStarbaseAsync(starbase: Starbase) {
      try {
        const starbasePlayer = await readFromRPCOrError(
          this.sageGame.getProvider().connection,
          this.sageGame.getSageProgram(),
          this.getStarbasePlayerAddress(starbase),
          StarbasePlayer,
          "confirmed"
        );
        return { type: "Success" as const, data: starbasePlayer };
      } catch (e) {
        return { type: "StarbasePlayerNotFound" as const };
      }
    }
    
    async getStarbasePlayerPodAsync(starbase: Starbase) {
      const starbasePlayerPod = await this.getSageGame().getCargoPodsByAuthority(this.getStarbasePlayerAddress(starbase));
      if (starbasePlayerPod.type !== "Success") return starbasePlayerPod;
      return { type: "Success" as const, data: starbasePlayerPod.data[0] };
    }

    /** POINTS */
    private async getUserPointsAsync() {
      try {
        const fetchUserPoints = await readAllFromRPC(
          this.sageGame.getProvider().connection,
          this.sageGame.getPointsProgram(),
          UserPoints,
          "confirmed",
          [
            {
              memcmp: {
                offset: 9,
                bytes: this.playerProfile.key.toBase58(),
              },
            }
          ]
        );

        const userPoints = fetchUserPoints.flatMap((item) =>
          item.type === "ok" ? [item.data] : []
        );

        if (userPoints.length === 0) throw new Error();
        
        return { type: "Success" as const, data: userPoints };
      } catch (e) {
        return { type: "UserPointsNotFound" as const };
      }
    }

    getMiningXpAccount() {
      return this.userPoints.filter((account) => 
        account.data.pointCategory.equals(this.sageGame.getGamePoints().miningXpCategory.category)
      )[0];
    }

    getMiningXpKey() {
      return UserPoints.findAddress(
        this.sageGame.getPointsProgram(), 
        this.sageGame.getGamePoints().miningXpCategory.category, 
        this.playerProfile.key
      )[0];
    }

    getPilotXpAccount() {
      return this.userPoints.filter((account) => 
        account.data.pointCategory.equals(this.sageGame.getGamePoints().pilotXpCategory.category)
      )[0];
    }

    getPilotXpKey() {
      return UserPoints.findAddress(
        this.sageGame.getPointsProgram(), 
        this.sageGame.getGamePoints().pilotXpCategory.category, 
        this.playerProfile.key
      )[0];
    }

    getCouncilRankXpAccount() {
      return this.userPoints.filter((account) => 
        account.data.pointCategory.equals(this.sageGame.getGamePoints().councilRankXpCategory.category)
      )[0];
    }

    getCouncilRankXpKey() {
      return UserPoints.findAddress(
        this.sageGame.getPointsProgram(), 
        this.sageGame.getGamePoints().councilRankXpCategory.category, 
        this.playerProfile.key
      )[0];
    }

    getCraftingXpAccount() {
      return this.userPoints.filter((account) => 
        account.data.pointCategory.equals(this.sageGame.getGamePoints().craftingXpCategory.category)
      )[0];
    }

    getCraftingXpKey() {
      return UserPoints.findAddress(
        this.sageGame.getPointsProgram(), 
        this.sageGame.getGamePoints().craftingXpCategory.category, 
        this.playerProfile.key
      )[0];
    }

    getDataRunningXpAccount() {
      return this.userPoints.filter((account) => 
        account.data.pointCategory.equals(this.sageGame.getGamePoints().dataRunningXpCategory.category)
      )[0];
    }

    getDataRunningXpKey() {
      return UserPoints.findAddress(
        this.sageGame.getPointsProgram(), 
        this.sageGame.getGamePoints().dataRunningXpCategory.category, 
        this.playerProfile.key
      )[0];
    }

    getLpXpAccount() {
      return this.userPoints.filter((account) => 
        account.data.pointCategory.equals(this.sageGame.getGamePoints().lpCategory.category)
      )[0];
    }

    getLpXpKey() {
      return UserPoints.findAddress(
        this.sageGame.getPointsProgram(), 
        this.sageGame.getGamePoints().lpCategory.category, 
        this.playerProfile.key
      )[0];
    }
    /** END POINTS */
}