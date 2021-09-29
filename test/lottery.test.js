const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

let lottery;
let owner;
let players;
beforeEach(async () => {
  let accounts = await ethers.getSigners();
  owner = accounts[0];
  players = accounts.splice(1, 20);
  const Lottery = await ethers.getContractFactory("Lottery");
  lottery = await Lottery.deploy();
});

describe("Lottery", () => {
  /**
    Tests if lottery is deployed by checking if it defined
   */
  it("Deploy", () => {
    assert.isDefined(lottery);
  });
  /**
    Tests if we can get the manager and if it is equal to the contract owner
   */
  it("Get manager", async () => {
    let manager = await lottery.manager();
    assert.equal(manager, owner.address);
  });
  /**
    Tests if we can enter the lottery above the minumum amount
   */
  it("Can enter with > 0.01 ETH", async () => {
    expect(
      await lottery
        .connect(players[0])
        .enter({ value: ethers.utils.parseEther("0.011") })
    ).to.be.ok;
  });
  /**
    Tests if we cannot enter with less that the required amount
   */
  it("Can't enter with <= 0.01 ETH", async () => {
    await expect(
      lottery
        .connect(players[0])
        .enter({ value: ethers.utils.parseEther("0.01") })
    ).to.be.revertedWith("Minimum value is 0.01 ETH");
  });
  /**
    Tests if we can enter and the correct player is stored in the contract
   */
  it("Add and retrieve 1 player", async () => {
    await lottery
      .connect(players[0])
      .enter({ value: ethers.utils.parseEther("0.011") });
    let retrievedPlayer = await lottery.players(0);
    assert.equal(retrievedPlayer, players[0].address);
  });
  /**
    Tests if we can add and retrieve multiple players
   */
  it("Add and retrieve multiple players", async () => {
    let playersToEnter = [players[0], players[1]];
    for (let player of playersToEnter) {
      await lottery
        .connect(player)
        .enter({ value: ethers.utils.parseEther("0.011") });
    }
    let retrievedPlayers = await lottery.getPlayers();
    assert.equal(2, retrievedPlayers.length);
    for (let i = 0; i < retrievedPlayers.length; i++) {
      assert.equal(retrievedPlayers[i], playersToEnter[i].address);
    }
  });
  /**
    Tests if the random number returns an object
  */
  it("Random number", async () => {
    assert.isObject(await lottery.random()); // returns object because JavaScript casts a large number to BigNumber
  });
  /**
    Tests if the manager can pick a winner
   */
  it("Manager picks winner", async () => {
    await lottery.enter({ value: ethers.utils.parseEther("0.011") });
    assert.isDefined(await lottery.pickWinner());
  });
  /**
    Tests if the player cannot pick a winner
   */
  it("Player cannot pick winner", async () => {
    await lottery.enter({ value: ethers.utils.parseEther("0.011") });
    await expect(lottery.connect(players[0]).pickWinner()).to.be.revertedWith(
      "Only the manager can do this"
    );
  });
  /**
    Tests if the player array is empty after picking winner
   */
  it("Players array reset after picking winner", async () => {
    await lottery.enter({ value: ethers.utils.parseEther("0.011") });
    assert.isDefined(await lottery.pickWinner());
    assert.equal(0, (await lottery.getPlayers()).length);
  });
  /**
    Tests if the winner gets all funds
   */
  it("Winner gets all funds", async () => {
    const initialBalance = await owner.getBalance();
    await lottery.enter({ value: ethers.utils.parseEther("1") });
    // We spend a bit more than 1 ETH, due to mining fees
    assert.isTrue(
      initialBalance - (await owner.getBalance()) > ethers.utils.parseEther("1")
    );
    await lottery.pickWinner();
    // We have a bit less ETH in the end due to mining fees
    assert.isTrue(
      initialBalance - (await owner.getBalance()) <
        ethers.utils.parseEther("0.001")
    );
  });
});
