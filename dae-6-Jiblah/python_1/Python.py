import random 
print('Welcome to a really bad version of rock paper scissors!')
print('Choose Rock Paper Scissors')
Player_choice = input()

print('You chose '+ Player_choice)
options = ["rock", "paper", "scissors"]
computer_move = random.choice(options)
print('computer chooses ' + computer_move)
if Player_choice == computer_move:
    print(" It's a tie!")
elif (
    (Player_choice == "rock" or "Rock" and computer_move == "scissors") or
    (Player_choice == "paper" or "Paper" and computer_move == "rock") or
    (Player_choice == "scissors" or "Scissors" and computer_move == "paper")
):
    print("You win!")
    quit()
else:
    print("Computer wins! You are a faliure and stupid")
    quit()