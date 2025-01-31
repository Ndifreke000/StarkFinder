import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import { OpenAI } from '@langchain/openai';
import { PrismaClient } from '@prisma/client';

let model: OpenAI | null = null;
let chain: ConversationChain | null = null;
let memory: BufferMemory | null = null;
let prisma: PrismaClient | null = null;

const initializeAI = () => {
  if (typeof window !== 'undefined') {
    console.warn('Attempting to initialize AI on the client side. This operation will be skipped.');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is undefined');
  }

  if (!model) {
    model = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
    });
  }

  if (!memory) {
    memory = new BufferMemory();
  }

  if (!chain && model && memory) {
    chain = new ConversationChain({ llm: model, memory });
  }

  if (!prisma) {
    prisma = new PrismaClient();
  }
};

// Initialize on import, but only if we're on the server side
if (typeof window === 'undefined') {
  initializeAI();
}

// Fetch user context from Prisma
async function fetchUserContext(userId: string) {
  if (!prisma) {
    if (typeof window === 'undefined') {
      initializeAI();
    }
    if (!prisma) {
      throw new Error('Prisma client is not initialized');
    }
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 10,
  });

  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 10,
  });

  return { transactions, messages };
}

// Add user context to LangChain memory
async function addUserContextToMemory(userId: string) {
  if (!memory) {
    if (typeof window === 'undefined') {
      initializeAI();
    }
    if (!memory) {
      throw new Error('Memory is not initialized');
    }
  }

  const { transactions, messages } = await fetchUserContext(userId);

  const contextString = `
    Past Transactions:
    ${transactions.map((txn) => `- ${txn.details}`).join('\n')}

    Past Messages:
    ${messages.map((msg) => `- ${msg.content}`).join('\n')}
  `;

  await memory.saveContext(
    { input: "User context" },
    { output: contextString }
  );
}

// Get AI response with user context
export async function getAIResponse(userId: string, userInput: string) {
  if (!chain) {
    if (typeof window === 'undefined') {
      initializeAI();
    }
    if (!chain) {
      throw new Error('Conversation chain is not initialized');
    }
  }

  await addUserContextToMemory(userId);
  const response = await chain.call({ input: userInput });
  return response.response;
}

// Suggest transactions based on user history
export async function suggestTransactions(userId: string) {
  const { transactions } = await fetchUserContext(userId);

  if (transactions.length > 0) {
    const suggestions = transactions.map((txn) => `- ${txn.details}`).join('\n');
    return `Based on your history, you might want to repeat these transactions:\n${suggestions}`;
  } else {
    return "You don't have any past transactions to suggest.";
  }
}