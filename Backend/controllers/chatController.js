const Groq = require('groq-sdk');
const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const Product = require('../models/productModel');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const systemPrompt = `
You are an expert AI assistant for an e-commerce store. Your job is to analyze the user's request and classify their intent.
Respond with a JSON object ONLY.
The JSON object must have an "intent" and an "entities" field.

Possible intents are: 'get_stock', 'get_order_status', 'get_top_products', 'clarify', 'general_greeting'.
Entities are the values needed for a query, like 'product_name' or 'order_id'.

- If the user asks about stock, use 'get_stock'.
- If the user asks for order status but doesn't provide an ID, your intent must be 'clarify', with a question asking for the ID.
- If the user greets you, use 'general_greeting'.

Example 1:
User: "How many Classic T-shirts are in stock?"
AI: {"intent": "get_stock", "entities": {"product_name": "Classic T-Shirt"}}

Example 2:
User: "check my order status"
AI: {"intent": "clarify", "question": "Of course! What is your order ID?"}

Example 3:
User: "hi there"
AI: {"intent": "general_greeting"}
`;

//  chat handler
exports.handleChat = async (req, res) => {
  const { message, conversationId } = req.body;

  try {
        let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    } else {
      conversation = new Conversation();
      await conversation.save();
    }

    // 2. Save user message
    await new Message({ conversationId: conversation._id, role: 'user', content: message }).save();
    
    // 3. Get LLM classification
    const classification = await getClassification(message);
    
    // 4. Act on the classification
    let aiResponseContent = "I'm sorry, I couldn't understand that. Can you rephrase?";

    switch (classification.intent) {
      case 'general_greeting':
        aiResponseContent = "Hello! How can I help you with our products or your orders today?";
        break;
      
      case 'clarify':
        aiResponseContent = classification.question;
        break;

      case 'get_stock':
        const productName = classification.entities.product_name;
        if (productName) {
          const product = await Product.findOne({ name: { $regex: new RegExp(productName, 'i') } });
          aiResponseContent = product 
            ? `We have ${product.stock_quantity} units of ${product.name} in stock.` 
            : `Sorry, I couldn't find a product named "${productName}".`;
        }
        break;
      
      // Add cases for 'get_order_status', etc. here
    }

    // 5. Save AI response and send to user
    await new Message({ conversationId: conversation._id, role: 'ai', content: aiResponseContent }).save();
    res.json({ response: aiResponseContent, conversationId: conversation._id });

  } catch (error) {
    console.error('Chat handling error:', error);
    res.status(500).json({ error: 'An error occurred.' });
  }
};


// Helper to get classification from Groq LLM
async function getClassification(userMessage) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    model: 'llama3-8b-8192',
    temperature: 0,
    max_tokens: 150,
  });
  const responseContent = chatCompletion.choices[0].message.content;
  // Safely parse the JSON response from the LLM
  try {
    return JSON.parse(responseContent);
  } catch (e) {
    console.error("Failed to parse LLM JSON response:", responseContent);
    return { intent: 'error', entities: {} };
  }
}