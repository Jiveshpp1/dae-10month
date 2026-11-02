import random
import sys

# Global game state variables
credits = 1000
last_bet = 0
loan_taken = False
loan_amount = 0
def get_valid_bet(game_name):
  # Fuction to check bet amount
  global credits, last_bet

  while True:
    bet_input = input(
        f"[{game_name}] How many credits would you like to bet? (or type 'y' to"
        " use last bet): "
    )

    if bet_input.lower() == "y":
      if last_bet == 0:
        print("You don't have a previous bet yet! Enter a number.")
        continue
      bet = last_bet
    else:
      if not bet_input.isdigit():
        print("Stupid. Please enter a valid number.")
        continue
      bet = int(bet_input)

    if bet <= 0:
      print("You must bet at least 1 credit.")
      continue
    if bet > credits:
      print(f"You do not have enough credits. You only have {credits}.")
      continue

    last_bet = bet
    return bet


def check_bankruptcy():
  """Checks if the player has lost all their money."""
  global credits
  if credits <= 0:
    print(
        "\n You ran out of credits! You lost your life savings. Good Job! Your wife left you and kids are starving. But since 99% percent of quit before they win big YOU WILL BEAT LIFE IN 2 days"
    )
    sys.exit()


def play_slots():
  """Handles the slots minigame."""
  global credits
  print(f"\n---  SLOTS  ---")

  bet = get_valid_bet("SLOTS")
  symbols = ["🍒", "🍋", "🔔", "⭐", "7️⃣"]
  result = [random.choice(symbols) for _ in range(3)]

  print(f"Result: [ {' | '.join(result)} ]")

  if result[0] == result[1] == result[2]:
    winnings = bet * 10
    credits += winnings
    print(f"Jackpot! You won {winnings} credits.")
  else:
    credits -= bet
    print(" You lost this round.")

  print(f"Credits left: {credits}")
  check_bankruptcy()

  again = input("Play slots again? (y/n): ").lower()
  if again == "y":
    play_slots()


def play_blackjack():
  """Handles the blackjack minigame."""
  global credits
  print(f"\n---  BLACKJACK  ---")

  bet = get_valid_bet("BLACKJACK")

  # Setup deck and initial deals
  deck = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11] * 4
  random.shuffle(deck)

  player_hand = [deck.pop(), deck.pop()]
  dealer_hand = [deck.pop(), deck.pop()]

  # Player turn loop
  while True:
    player_score = sum(player_hand)

    # Adjust for Aces if busting
    while player_score > 21 and 11 in player_hand:
      player_hand[player_hand.index(11)] = 1
      player_score = sum(player_hand)

    print(f"Your hand: {player_hand} (Score: {player_score})")
    print(f"Dealer's visible card: [{dealer_hand[0]}]")

    if player_score > 21:
      print(" You busted!")
      break
    if player_score == 21:
      print(" Blackjack!")
      break

    action = input("Do you want to (h)it or (s)tand? ").lower()
    if action == "h":
      player_hand.append(deck.pop())
    elif action == "s":
      break
    else:
      print("Invalid choice.")

  player_score = sum(player_hand)

  # Dealer turn loop (only plays if player didn't bust)
  if player_score <= 21:
    print(f"\nDealer reveals hidden card. Full hand: {dealer_hand}")
    while sum(dealer_hand) < 17:
      dealer_hand.append(deck.pop())
      # Adjust dealer Aces
      while sum(dealer_hand) > 21 and 11 in dealer_hand:
        dealer_hand[dealer_hand.index(11)] = 1

    dealer_score = sum(dealer_hand)
    print(f"Dealer's final hand: {dealer_hand} (Score: {dealer_score})")

    # Determine winner
    if dealer_score > 21:
      print(f" Dealer busted! You win {bet} credits.")
      credits += bet
    elif player_score > dealer_score:
      print(f" You beat the dealer! You win {bet} credits.")
      credits += bet
    elif player_score < dealer_score:
      print(" Dealer wins. You lose your bet.")
      credits -= bet
    else:
      print(" It's a tie (Push). You keep your credits.")
  else:
    credits -= bet

  print(f"Credits left: {credits}")
  check_bankruptcy()

  again = input("Play Blackjack again? (y/n): ").lower()
  if again == "y":
    play_blackjack()


def play_roulette():
  """Handles the roulette minigame."""
  global credits
  print(f"\n---  ROULETTE  ---")

  bet = get_valid_bet("ROULETTE")

  print("Choose your bet type:")
  print("1. Specific Number (0-36) - Pays 35:1")
  print("2. Red - Pays 1:1")
  print("3. Black - Pays 1:1")
  bet_type = input("Pick an option (1-3): ")

  # Setup board math
  red_numbers = [
      1,
      3,
      5,
      7,
      9,
      12,
      14,
      16,
      18,
      19,
      21,
      23,
      25,
      27,
      30,
      32,
      34,
      36,
  ]
  winning_number = random.randint(0, 36)
  winning_color = (
      "Green"
      if winning_number == 0
      else ("Red" if winning_number in red_numbers else "Black")
  )

  is_win = False
  payout_multiplier = 0

  if bet_type == "1":
    target_num = input("Enter a number between 0 and 36: ")
    if target_num.isdigit() and 0 <= int(target_num) <= 36:
      print(f"\nSpinning... The ball lands on {winning_color} {winning_number}!")
      if int(target_num) == winning_number:
        is_win = True
        payout_multiplier = 35
    else:
      print("Stupid. Invalid number choice.")
      return play_roulette()

  elif bet_type == "2":
    print(f"\nSpinning... The ball lands on {winning_color} {winning_number}!")
    if winning_color == "Red":
      is_win = True
      payout_multiplier = 1

  elif bet_type == "3":
    print(f"\nSpinning... The ball lands on {winning_color} {winning_number}!")
    if winning_color == "Black":
      is_win = True
      payout_multiplier = 1
  else:
    print("Invalid choice.")
    return play_roulette()

  # Process wins/losses
  if is_win:
    winnings = bet * payout_multiplier
    credits += winnings
    print(f" Win! You won {winnings} credits.")
  else:
    credits -= bet
    print(" Lose! Better luck next spin.")

  print(f"Credits left: {credits}")
  check_bankruptcy()

  again = input("Play Roulette again? (y/n): ").lower()
  if again == "y":
    play_roulette()


def menu():
  """Main casino hub menu loop."""
  while True:
    print(f"\n=================================")
    print(f"  CASINO MENU | Credits: {credits}")
    print(f"=================================")
    print("1. Play Slots")
    print("2. Play Blackjack")
    print("3. Play Roulette")
    print("4. Leave the casino")

    choice = input("Pick a game to play (1-4): ")

    if choice == "1":
      play_slots()
    elif choice == "2":
      play_blackjack()
    elif choice == "3":
      play_roulette()
    elif choice == "4":
      print(f"\nThanks for playing! You left with {credits} credits. Goodbye.")
      sys.exit()
    else:
      print("\nInvalid choice. Choose a number from 1 to 4.")


def main():
  """Starts game execution and performs age validation."""
  print("Welcome to the casino! Please gamble your lifesavings away.")
  global credits
  while True:
    age_input = input("How old are you? ")
    if age_input.lower() == "f2l":
      print("You have unlocked the secret cheat code! You now have 1,000,000 credits to gamble with.")
      print("you can rig games too")
      credits = 1000000
      age = 21  # Set a default age for cheat code users
      print("you can rig games too(Not iplemented)")
      break
    elif age_input.isdigit():
      age = int(age_input)
      break
    else:
      print("Stupid. Enter a valid number.")

  if age <= 17:
    print("You are too young to play this game. Quit.")
    sys.exit()
  elif age >= 121:
    print("You are faking your age to play this game. Quit.")
    sys.exit()
  else:
    print("\nYou are old enough to play this game.")
    print(f"You have {credits} credits to gamble with.")
    input("Press Enter to continue...")
    menu()


if __name__ == "__main__":
  main()
44