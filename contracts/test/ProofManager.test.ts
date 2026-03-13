import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, zeroAddress } from "viem";

describe("ProofManager", async function () {
    const { viem } = await network.connect();

    async function deployCore() {
        const [owner] = await viem.getWalletClients();
        const initialMint = parseEther("1000000");

        const treasury = await viem.deployContract("Treasury");

        const token = await viem.deployContract("Herena", [treasury.address, initialMint]);

        await treasury.write.setToken([token.address], {
            account: owner.account,
        });

        const taskManager = await viem.deployContract("TaskManager", [
            token.address,
            treasury.address,
        ]);

        await treasury.write.setTaskManager([taskManager.address], {
            account: owner.account,
        });

        const proofManager = await viem.deployContract("ProofManager", [taskManager.address]);

        const votingManager = await viem.deployContract("MockVotingManager");

        await proofManager.write.setVotingManager([votingManager.address], {
            account: owner.account,
        });

        return { owner, token, treasury, taskManager, proofManager, votingManager };
    }

    it("should submit proof, store it and emit event + create proposal", async function () {
        const { owner, taskManager, proofManager, votingManager } = await deployCore();

        const rewardPerCompletion = 10n;
        const maxCompletions = 3n;
        const deadline = (await (await viem.getPublicClient()).getBlock())!.timestamp + 3600n;

        await taskManager.write.createTask(
            ["Task for proof", rewardPerCompletion, maxCompletions, deadline, "ipfs://task"],
            { account: owner.account },
        );

        const [, submitter] = await viem.getWalletClients();

        const proofUri = "ipfs://proof1";

        // Just assert that the event is emitted; address & data are checked below via storage.
        await viem.assertions.emit(
            proofManager.write.submitProof([0n, proofUri], {
                account: submitter.account,
            }),
            proofManager,
            "ProofSubmitted",
        );

        const stored = await proofManager.read.getProof([0n]);
        assert.equal(stored.id, 0n);
        assert.equal(stored.taskId, 0n);
        assert.equal(stored.submitter.toLowerCase(), submitter.account.address.toLowerCase());
        assert.equal(stored.proofURI, proofUri);
        assert.equal(stored.resolved, false);

        const proposalId = await votingManager.read.nextProposalId();
        assert.equal(proposalId, 1n);
    });

    it("should prevent same submitter from submitting multiple proofs for same task", async function () {
        const { owner, taskManager, proofManager } = await deployCore();
        const [, submitter] = await viem.getWalletClients();

        const rewardPerCompletion = 10n;
        const maxCompletions = 3n;
        const totalReward = rewardPerCompletion * maxCompletions;
        const deadline = (await (await viem.getPublicClient()).getBlock())!.timestamp + 3600n;

        await taskManager.write.createTask(
            ["Dup task", rewardPerCompletion, maxCompletions, deadline, "ipfs://dup"],
            { account: owner.account },
        );

        await proofManager.write.submitProof([0n, "ipfs://proof1"], {
            account: submitter.account,
        });

        await viem.assertions.revertWithCustomError(
            proofManager.write.submitProof([0n, "ipfs://proof2"], {
                account: submitter.account,
            }),
            proofManager,
            "AlreadySubmittedForTask",
        );
    });

    it("should revert when task is not active or completion limit reached", async function () {
        const { owner, taskManager, proofManager } = await deployCore();
        const [, submitter] = await viem.getWalletClients();

        const rewardPerCompletion = 10n;
        const maxCompletions = 1n;
        const totalReward = rewardPerCompletion * maxCompletions;
        const deadline = (await (await viem.getPublicClient()).getBlock())!.timestamp + 3600n;

        await taskManager.write.createTask(
            ["Limited task", rewardPerCompletion, maxCompletions, deadline, "ipfs://lim"],
            { account: owner.account },
        );

        // mark completion so that limit is reached
        await taskManager.write.setProofManager([owner.account.address], {
            account: owner.account,
        });
        await taskManager.write.incrementCompletion([0n], {
            account: owner.account,
        });

        await viem.assertions.revertWithCustomError(
            proofManager.write.submitProof([0n, "ipfs://after-limit"], {
                account: submitter.account,
            }),
            proofManager,
            "TaskNotActive",
        );
    });

    it("should revert when voting manager is not set or proofURI empty", async function () {
        const { owner, taskManager } = await deployCore();

        // fresh ProofManager without voting manager
        const proofManagerNoVm = await viem.deployContract("ProofManager", [taskManager.address]);

        const rewardPerCompletion = 10n;
        const maxCompletions = 1n;
        const totalReward = rewardPerCompletion * maxCompletions;
        const deadline = (await (await viem.getPublicClient()).getBlock())!.timestamp + 3600n;

        await taskManager.write.createTask(
            ["VM not set task", rewardPerCompletion, maxCompletions, deadline, "ipfs://x"],
            { account: owner.account },
        );

        const [, submitter] = await viem.getWalletClients();

        await viem.assertions.revertWithCustomError(
            proofManagerNoVm.write.submitProof([0n, "ipfs://proof"], {
                account: submitter.account,
            }),
            proofManagerNoVm,
            "VotingManagerNotSet",
        );

        // empty uri case
        const { proofManager } = await deployCore();
        await viem.assertions.revertWithCustomError(
            proofManager.write.submitProof([0n, ""], {
                account: submitter.account,
            }),
            proofManager,
            "EmptyProofURI",
        );
    });
});
