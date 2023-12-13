// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.17;

import { MerkleClaimERC20 } from "./MerkleClaimERC20.sol";


/// @title MerkleClaimERC20
/// @notice Bulk claimer for MerkleClaimERC20 if same root is reused
/// @author Luigy Lemon
contract BulkMerkleClaimer {

    address[]  merkleAdrs;
    address owner = 0xBF8d706C844F1849B063870a42417C20227276F6;

    constructor() { 
        merkleAdrs.push(0xc21a7B1e58356892F606beE801A00C7bAD72edF7);
        merkleAdrs.push(0x6Ce74a957a7520Affdf07FBc3b5563F8b81CCaCC);
        merkleAdrs.push(0xb88d66e7721a20b58E7d18D81cdB9682307399bA);
    }

    modifier onlyOwner(){
        require(msg.sender == owner,"not owner");
        _;
    }


    function addMerkleClaimERC20(address newContract) external onlyOwner{
        merkleAdrs.push(newContract);
    }

    function batchHasClaimed(address token, address user) view external returns(bool){
        for (uint8 i= 0; i< merkleAdrs.length;i++){
            bool temp = MerkleClaimERC20(merkleAdrs[i]).hasClaimed(token, user);
            if (temp == false){
                return false;
            }
        }
        return true;
    }

    function batchClaim(address token, address user, uint256 amount, bytes32[] calldata proof) public{
        for (uint8 i= 0; i< merkleAdrs.length; i++){
            bool claimed = MerkleClaimERC20(merkleAdrs[i]).hasClaimed(token, user);
            if (!claimed){
                MerkleClaimERC20(merkleAdrs[i]).claim(token, user, amount, proof);
            }
        }
    }
}