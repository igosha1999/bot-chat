build:
	docker build -t chat-bot .
run:
	docker run -d -p 3000:3000 --name  bot-chat --rm bot-chat
