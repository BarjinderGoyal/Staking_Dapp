const { expect } = require("chai");

describe("Stacking", () => {
  beforeEach(async () => {
    [signer1, signer2] = await ethers.getSigners();

    Staking = await ethers.getContractFactory("Staking", signer1);
    staking = await Staking.deploy({
      value: ethers.utils.parseEther("10"),
    });
  });

  describe("deploy", () => {
    it("should set owner", async () => {
      expect(await staking.owner()).to.equal(signer1.address);
    });

    it("sets up tiers and lockPeriods", async () => {
      expect(await staking.lockPeriods(0)).to.equal(30);
      expect(await staking.lockPeriods(1)).to.equal(90);
      expect(await staking.lockPeriods(2)).to.equal(180);

      expect(await staking.tiers(30)).to.equal(700);
      expect(await staking.tiers(90)).to.equal(1000);
      expect(await staking.tiers(180)).to.equal(1200);
    });
  });
});

describe("stakeEther", () => {
  it("tranfers ether", async () => {
    const provider = waffle.provider;
    let contractBalance;
    let signerBalance;
    const transferAmount = ethers.utils.parseEther("2.0");
    contractBalance = await provider.getBalance(staking.address);
    signerBalance = await signer1.getBalance();

    const transaction = await staking
      .connect(signer1)
      .stakeEther(30, { value: transferAmount });
    const receipt = await transaction.wait();
    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

    expect(await signer1.getBalance()).to.equal(
      signerBalance.sub(transferAmount).sub(gasUsed)
    );

    expect(await provider.getBalance(staking.address)).to.equal(
      contractBalance.add(transferAmount)
    );
  });

  describe("Add Position", async () => {
    Staking = await ethers.getContractFactory("Staking", signer1);
    staking = await Staking.deploy({
      value: ethers.utils.parseEther("10"),
    });

    it("adds a position to positions", async () => {
      const provider = waffle.provider;
      let position;
      const transferAmount = ethers.utils.parseEther("1.0");

      position = await staking.positions(0);
      console.group(position.positionId);

      expect(position.positionId).to.equal(0);
      expect(position.walletAddress).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(position.createDate).to.equal(0);
      expect(position.unlockDate).to.equal(0);
      expect(position.percentInterest).to.equal(0);
      expect(position.weiStaked).to.equal(0);
      expect(position.weiInterest).to.equal(0);
      expect(position.open).to.equal(false);

      expect(await staking.currentPositonId()).to.equal(0);

      const transaction = await staking
        .connect(signer1)
        .stakeEther(90, { value: transferAmount });
      const receipt = await transaction.wait();
      const block = await provider.getBlock(receipt.blockNumber);

      position = await staking.position(0);

      expect(position.positionId).to.equal(0);
      expect(position.walletAddress).to.equal(signer1.address);
      expect(position.createDate).to.equal(block.timestamp);
      expect(position.unlockDate).to.equal(block.timestamp + 86400 * 90); //90 days
      expect(position.percentInterest).to.equal(1000);
      expect(position.weiStaked).to.equal(transferAmount);
      expect(position.weiInterest).to.equal(
        ether.BigNumber.from(transferAmount).mul(1000).div(10000)
      );
      expect(position.open).to.equal(true);

      expect(await staking.currentPositonId()).to.equal(1);
    });
  });
  describe("check different positions", async () => {
    Staking = await ethers.getContractFactory("Staking", signer1);
    staking = await Staking.deploy({
      value: ethers.utils.parseEther("10"),
    });
    it("adds address amd positionId to positionIdsByAddress", async () => {
      const transferAmount = await ethers.utils.parseEther("0.5");

      await staking.connect(signer1).stakeEther(30, { value: transferAmount });
      await staking.connect(signer2).stakeEther(90, { value: transferAmount });

      expect(await staking.positionIdsByAddress(signer1.address, 0)).to.equal(
        0
      );
      expect(await staking.positionIdsByAddress(signer2.address, 0)).to.equal(
        1
      );
    });
  });
});

describe("modify lock periods", () => {
  beforeEach(async () => {
    [signer1, signer2] = await ethers.getSigners();

    Staking = await ethers.getContractFactory("Staking", signer1);
    staking = await Staking.deploy({
      value: ethers.utils.parseEther("10"),
    });
  });
  describe("owner", () => {
    it("should create a new lock period", async () => {
      await staking.connect(signer1).modifyLockPeriods(100, 999);
      expect(await staking.tiers(100)).to.equal(999);
      expect(await staking.lockPeriods(3)).to.equal(100);
    });

    it("should modify an existinglock period", async () => {
      await staking.connect(signer1).modifyLockPeriods(30, 150);
      expect(await staking.tiers(30)).to.equal(150);
    });
  });
  describe("non-owner", () => {
    it("reverts", async () => {
      expect(
        staking.connect(signer2).modifyLockPeriods(100, 999)
      ).to.be.revertedWith("Only owner may modify staking periods");
    });
  });
});

describe("getInterestRate", () => {
  it("returns the interest rate for a specific lockperiod", async () => {
    const interestRate = await staking.getInterestRate(30);
    expect(interestRate).to.equal(700);
  });
});

describe("getPositionById", () => {
  it("returns data about a specific position, given a positionId", async () => {
    const provider = waffle.provider;
    const transferAmount = await ethers.utils.parseEther("5");
    const transaction = await staking
      .connect(signer1)
      .stakeEther(90, { value: transferAmount });
    const receipt = transaction.wait();
    const block = await provider.getBlock(receipt.blockNumber);
    const position = await staking.connect(signer1.address).getPositionByIdS(0);

    expect(position.positionId).to.equal(0);
    expect(position.walletAddress).to.equal(signer1.address);
    expect(position.createDate).to.equal(block.timestamp);
    expect(position.unlockDate).to.equal(block.timestamp + 86400 * 90); //90 days
    expect(position.percentInterest).to.equal(1000);
    expect(position.weiStaked).to.equal(transferAmount);
    // expect(position.weiInterest).to.equal(
    //   ethers.BigNumber.from(transferAmount).mul(1000).div(10000)
    // );

    expect(position.open).to.equal(true);
  });
});

describe("getPositionIdsForAddress", () => {
  beforeEach(async () => {
    [signer1, signer2] = await ethers.getSigners();

    Staking = await ethers.getContractFactory("Staking", signer1);
    staking = await Staking.deploy({
      value: ethers.utils.parseEther("10"),
    });
  });
  it("returns a list of positionIds created by a specific address", async () => {
    let transaction;
    transaction = await staking
      .connect(signer1)
      .stakeEther(90, { value: ethers.utils.parseEther("5") });

    transaction = await staking
      .connect(signer1)
      .stakeEther(90, { value: ethers.utils.parseEther("10") });

    const positionIds = await staking.getPositionIdsForAddress(signer1.address);

    expect(positionIds.map((p) => Number(p))).to.eql([0, 1]);
  });
});

describe("changeUnlockDate", () => {
  describe("owner", () => {
    it("changes the unlockDate", async () => {
      const transaction = await staking
        .connect(signer2)
        .stakeEther(90, { value: ethers.utils.parseEther("8") });

      const positionOld = await staking.getPositionByIdS(0);

      const newUnlockDate = positionOld.unlockDate - 86400 * 500;
      await staking.connect(signer1).changeUnlockDate(0, newUnlockDate);
      const positionNew = await staking.getPositionByIdS(0);

      expect(positionNew.unlockDate).to.be.equal(
        positionOld.unlockDate - 86400 * 500
      );
    });
  });
  describe("non-owner", () => {
    it(" reverts", async () => {
      const data = { value: ethers.utils.parseEther("8") };
      const transaction = await staking
        .connect(signer2)
        .stakeEther(90, { value: ethers.utils.parseEther("8") });
      const positionOld = await staking.getPositionByIdS(0);

      const newUnlockDate = positionOld.unlockDate - 86400 * 500;

      expect(
        staking.connect(signer2).changeUnlockDate(0, newUnlockDate)
      ).to.be.revertedWith("Only owner may modify staking period");
    });
  });
});

describe("closePosition", () => {
  beforeEach(async () => {
    [signer1, signer2] = await ethers.getSigners();

    Staking = await ethers.getContractFactory("Staking", signer1);
    staking = await Staking.deploy({
      value: ethers.utils.parseEther("10"),
    });
  });
  describe("after unlock date", () => {
    it("transfers principal and interest", async () => {
      let transaction;
      let receipt;
      let block;
      const provider = waffle.provider;
      transaction = await staking
        .connect(signer2)
        .stakeEther(90, { value: ethers.utils.parseEther("8") });
      receipt = await transaction.wait();
      block = await provider.getBlock(receipt.blockNumber);
      const newUnlockDate = block.timestamp - 86400 * 100;
      await staking.connect(signer1).changeUnlockDate(0, newUnlockDate);
      const position = await staking.getPositionByIdS(0);

      const signerBalanceBefore = await signer2.getBalance();

      transaction = await staking.connect(signer2).closePosition(0);
      receipt = await transaction.wait();

      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const signerBalanceAfter = await signer2.getBalance();
      expect(signerBalanceAfter).to.equal(
        signerBalanceBefore
          .sub(gasUsed)
          .add(position.weiStaked)
          .add(position.weiInterest)
      );
    });

    describe("before unlock date", () => {
      it("transfers only principal", async () => {
        let transaction;
        let receipt;
        let block;
        const provider = waffle.provider;
        transaction = await staking
          .connect(signer2)
          .stakeEther(90, { value: ethers.utils.parseEther("5") });
        receipt = await transaction.wait();
        block = await provider.getBlock(receipt.blockNumber);
        const position = await staking.getPositionByIdS(0);

        const signerBalanceBefore = await signer2.getBalance();

        transaction = await staking.connect(signer2).closePosition(0);
        receipt = await transaction.wait();

        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const signerBalanceAfter = await signer2.getBalance();
        expect(signerBalanceAfter).to.equal(
          signerBalanceBefore.sub(gasUsed).add(position.weiStaked)
        );
      });
    });
  });
});
