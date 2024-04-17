export class NoEnoughRepairKits extends Error {
  constructor() {
    super("NoEnoughRepairKits");
    this.name = "NoEnoughRepairKits";
  }
}

export class NoEnoughTokensToPerformSageAction extends Error {
  constructor() {
    super("NoEnoughTokensToPerformSageAction");
    this.name = "NoEnoughTokensToPerformSageAction";
  }
}

export class BuildAndSignTransactionError extends Error {
  constructor() {
    super("BuildAndSignTransactionError");
    this.name = "BuildAndSignTransactionError";
  }
}

export class SendTransactionsFailed extends Error {
  constructor() {
    super("SendTransactionsFailed");
    this.name = "SendTransactionsFailed";
  }
}
