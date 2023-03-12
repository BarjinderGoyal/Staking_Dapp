async function main() {
  // [signer1, signer2] = await ethers.getSigners();

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy({
    value: ethers.utils.parseEther("0.1"),
  });
  console.log("Staking contract deployed to:", staking.address);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
