// chatPage.js
import SendbirdChat from '@sendbird/chat';
import { GroupChannelModule, GroupChannelHandler } from '@sendbird/chat/groupChannel';
import { FillTheBody } from '../main.js';

const sb = SendbirdChat.init({
    appId: 'D183EE95-CAD0-42B9-89B0-09BB1654425F',
    modules: [new GroupChannelModule()],
});

let currentChannel = null;

export async function SetupChatPage() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        await sb.connect(user.user_id);
        await sb.updateCurrentUserInfo({
            nickname: user.nickname,
            profileUrl: user.thumbnail_image_url,
        });

        AddChannelHandler();

        setupEventListeners();

        // Load and display channel list
        await LoadChannelList();
    } else {
        await FillTheBody('login');
    }
}

function setupEventListeners() {
    // Send message on button click
    const sendButton = document.getElementById('sendButton');
    sendButton.addEventListener('click', async () => {
        const messageInput = document.getElementById('messageInput');
        const messageText = messageInput.value.trim();
        if (messageText && currentChannel) {
            await SendMessage(currentChannel, messageText);
            messageInput.value = '';
        }
    });

    // Send message on Enter key press
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const messageText = messageInput.value.trim();
            if (messageText && currentChannel) {
                await SendMessage(currentChannel, messageText);
                messageInput.value = '';
            }
        }
    });

    // Navigation button event listeners
    const homeBtn = document.getElementById('home-btn');
    homeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await FillTheBody('home');
    });

    const postOrderBtn = document.getElementById('post-order-btn');
    postOrderBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await FillTheBody('postOrder');
    });

    const channelListBtn = document.getElementById('channel-list-btn');
    channelListBtn.addEventListener('click', () => {
        const offcanvasChannelList = new bootstrap.Offcanvas(document.getElementById('channelListOffcanvas'));
        offcanvasChannelList.toggle();
    });

    const menuBtn = document.getElementById('menu-btn');
    menuBtn.addEventListener('click', () => {
        const offcanvasMenu = new bootstrap.Offcanvas(document.getElementById('offcanvasMenu'));
        offcanvasMenu.toggle();
    });
}

async function LoadChannelList() {
    const channelListElement = document.getElementById('channelList');
    channelListElement.innerHTML = '';

    const channelListQuery = sb.groupChannel.createMyGroupChannelListQuery();
    channelListQuery.limit = 50;
    channelListQuery.includeEmpty = true;

    try {
        const channels = await channelListQuery.next();
        channels.forEach(channel => {
            DisplayChannelItem(channel);
        });

        // Do not automatically select a channel; let the user choose
    } catch (error) {
        console.error('Error loading channel list:', error);
    }
}

function DisplayChannelItem(channel) {
    const channelListElement = document.getElementById('channelList');

    const channelItemTemplate = document.getElementById('channel-list-item-template');
    const channelItem = channelItemTemplate.content.cloneNode(true).querySelector('.channel-list-item');

    channelItem.dataset.channelUrl = channel.url;
    channelItem.querySelector('.channel-name').textContent = channel.name || 'Unnamed Channel';
    channelItem.querySelector('.channel-last-message').textContent = channel.lastMessage ? channel.lastMessage.message : 'No messages yet';

    channelItem.addEventListener('click', async () => {
        currentChannel = channel;
        // Close the channel list offcanvas
        const offcanvasChannelList = bootstrap.Offcanvas.getInstance(document.getElementById('channelListOffcanvas'));
        offcanvasChannelList.hide();

        await LoadMessages(currentChannel);
    });

    channelListElement.appendChild(channelItem);
}

async function LoadMessages(channel) {
    const messageListElement = document.getElementById('messageList');
    messageListElement.innerHTML = '';

    const messageListParams = {
        prevResultSize: 50,
        isInclusive: true,
        reverse: false,
        includeMetaArray: true,
        includeReactions: true,
        includeSender: true,
    };

    try {
        const messages = await channel.getMessagesByTimestamp(Date.now(), messageListParams);
        messages.forEach(message => {
            DisplayMessage(message, false);
        });
        // Scroll to the bottom after loading messages
        messageListElement.scrollTop = messageListElement.scrollHeight;
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

function DisplayMessage(message, shouldScroll) {
    const messageListElement = document.getElementById('messageList');

    const messageId = `message-${message.messageId || Date.now()}`;

    if (document.getElementById(messageId)) {
        return;
    }

    const messageItemTemplate = document.getElementById('message-template');
    const messageItem = messageItemTemplate.content.cloneNode(true).querySelector('.message-item');
    messageItem.id = messageId;

    // Determine if the message was sent by the current user
    const isSentByCurrentUser = message.sender && message.sender.userId === sb.currentUser.userId;

    if (isSentByCurrentUser) {
        messageItem.classList.add('sent');
    } else {
        messageItem.classList.add('received');
    }

    const contentElement = messageItem.querySelector('.message-content');
    contentElement.classList.add(isSentByCurrentUser ? 'sent' : 'received');

    // Correctly access the message text
    contentElement.textContent = message.message || message.plainText || message.messageText || '';

    const timestampElement = messageItem.querySelector('.message-timestamp');

    const messageDate = new Date(message.createdAt);
    const options = { hour: '2-digit', minute: '2-digit' };
    timestampElement.textContent = messageDate.toLocaleTimeString([], options);

    messageListElement.appendChild(messageItem);

    if (shouldScroll) {
        messageListElement.scrollTop = messageListElement.scrollHeight;
    }
}

async function SendMessage(channel, messageText) {
    const params = {
        message: messageText,
        // Add a unique request ID to identify the message
        requestId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    try {
        const message = await channel.sendUserMessage(params);
        // Manually assign sender information
        message.sender = sb.currentUser;
        DisplayMessage(message, true);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function AddChannelHandler() {
    const channelHandler = new GroupChannelHandler();

    channelHandler.onMessageReceived = (channel, message) => {
        if (currentChannel && channel.url === currentChannel.url) {
            DisplayMessage(message, true);
        }
    };

    channelHandler.onChannelChanged = async (channel) => {
        // Update the channel list when a channel is changed
        await LoadChannelList();
    };

    sb.groupChannel.addGroupChannelHandler('CHAT_HANDLER', channelHandler);
}