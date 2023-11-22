// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.17;

/// ============ Imports ============

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // Solmate: ERC20
import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; // OZ: MerkleProof

/// @title MerkleClaimERC20
/// @notice ERC20 claimable by members of a merkle tree
/// @author Anish Agnihotri <contact@anishagnihotri.com>
/// @author Luigy Lemon -> modified for multi-token airdrops.
contract MerkleClaimERC20 {

  /// ============ Immutable storage ============

  /// @notice ERC20-claimee inclusion root
  mapping(address => bytes32) public merkleRoots;
  address public immutable DAO = 0xb4c575308221CAA398e0DD2cDEB6B2f10d7b000A;
  /// ============ Mutable storage ============

  /// @notice Mapping of addresses who have claimed tokens
  mapping(address => mapping(address => bool)) public hasClaimed;

  /// ============ Errors ============

  /// @notice Thrown if address has already claimed
  error AlreadyClaimed();
  /// @notice Thrown if address/amount are not part of Merkle tree
  error NotInMerkle();

  /// ============ Constructor ============

  /// @notice Creates a new MerkleClaimERC20 contract for already existing ERC20
  /// @param _tokenAddresses of claimable tokens
  /// @param _merkleRoots of claimees
  constructor(
    address[]  memory _tokenAddresses,
    bytes32[] memory _merkleRoots
  ) {
    require(_tokenAddresses.length == _merkleRoots.length , "Need as many merkle Roots as tokens");
    for (uint8 i =0; i< _tokenAddresses.length; i++){
        merkleRoots[_tokenAddresses[i]] = _merkleRoots[i]; // Update root 
    }
    
  }

  /// ============ Events ============

  /// @notice Emitted after a successful token claim
  /// @param to recipient of claim
  /// @param amount of tokens claimed
  event Claim(address indexed to, uint256 amount);

  /// ============ Functions ============

  /// @notice Allows claiming tokens if address is part of merkle tree
  /// @param to address of claimee
  /// @param amount of tokens owed to claimee
  /// @param proof merkle proof to prove address and amount are in tree
  function claim(address token, address to, uint256 amount, bytes32[] calldata proof) external {
    // Throw if address has already claimed tokens
    if (hasClaimed[token][to]) revert AlreadyClaimed();

    // Verify merkle proof, or revert if not in tree
    bytes32 leaf = keccak256(abi.encodePacked(to, amount));
    bool isValidLeaf = MerkleProof.verify(proof, merkleRoots[token], leaf);
    if (!isValidLeaf) revert NotInMerkle();

    // Set address to claimed
    hasClaimed[token][to] = true;

    // Send tokens to address
    IERC20(token).transfer(to, amount);

    // Emit claim event
    emit Claim(to, amount);
  }

  function protocolFallback(IERC20 token, uint256 amount) external {
    require(msg.sender == DAO);
    // Send tokens back to DAO
    token.transfer(DAO, amount);
  }
}
