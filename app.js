const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

const API_KEY = "AIzaSyA_bvXC_QcAS84lXppOmkvERtN66YsAaL0";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`

let typingInterval, controller;
const chatHistory = [];
const userData = {message: "", file: {}};
let userMessage = "";

//function to create message element
const createMsgElement = (content, ...classes) =>{
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

//scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior:"smooth"});

//simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent ="";
    const words = text.split(" ");
    let wordIndex = 0;

    //set an interval to type each word
    typingInterval = setInterval(() => {
        if(wordIndex < words.length){
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            scrollToBottom();
        }else{
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
        }
    }, 40);
}

//make the api call and generate the bot's reponse
const generateResponse = async (botMsgDiv) =>{

    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    //add user message to the chat history
    chatHistory.push({
        role: "user",
        parts: [{text : userData.message}, ...(userData.file.data
               ? [{ inline_data: (({ fileName, isImage, ...rest}) => rest)(userData.file) }] : [])]
    });

    try{
        //send chat history to API to get a response
        const response = await fetch(API_URL, {
            method : "POST",
            headers : {"Content-Type" : "application/json"},
            body : JSON.stringify({ contents: chatHistory}),
            signal: controller.signal
        });
        const data = await response.json();
        console.log(data);
        if(!response.ok) throw new Error(data.error.message);

        //process the reponse text and display with tping effect
        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        typingEffect(responseText, textElement, botMsgDiv);

        chatHistory.push({role: "model", parts: [{text : responseText}] });

    }catch(error) {
        textElement.style.color = "#d62939" ;
        textElement.textContent = error.name === "AbortError"? "Response generation stopped." : error.message;
         botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
    }finally {
        userData.file = {};
    }
}

//handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    userMessage = promptInput.value.trim();
    if(!userMessage || document.body.classList.contains("bot-responding")) return;

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    // Generate user messgae Html and add in the chats container
    const userMessageHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64, 
    ${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment">
    <span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}`;

    const userMsgDiv = createMsgElement(userMessageHTML, "user-message");

    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() =>{
        // Generate bot messgae Html and add in the chats container
    const botMessageHTML =`<img src="logo.svg" class="avatar"><p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMsgElement(botMessageHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
    },500);
}

//handle file input change (file upload)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if(!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];

        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        // store file data in userData obj
        userData.file = { fileName:file.name, data:base64String, mime_type: file.type, isImage };
    }
});
//cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
})
//stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval); 
    chatsContainer.querySelector(".bot-message-loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
})

//delet chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("bot-responding", "chats-active");
})

//handle suggestions click
document.querySelectorAll(".suggestion-items").forEach(item => {
    item.addEventListener("click", () =>{
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});

//toggle dark/light theme
themeToggle.addEventListener("click", () =>{
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

//set initial theme from local storage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());