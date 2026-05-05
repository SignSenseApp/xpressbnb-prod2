import { useState } from 'react';
import { MessageCircle, Send, Bot, User, Sparkles } from 'lucide-react';
import PremiumFeatureWrapper from './PremiumFeatureWrapper';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIHostCoachProps {
  property: any;
  locked?: boolean;
  onUpgrade?: () => void;
}

export default function AIHostCoach({ property, locked = false, onUpgrade }: AIHostCoachProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI Host Coach. I've analyzed your property "${property?.title || 'listing'}" and I'm here to help you improve your bookings and visibility. What would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickQuestions = [
    'Why am I not getting bookings?',
    'How can I improve visibility?',
    'What should I fix next?',
    'Is my price too high?',
  ];

  const generateResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('booking') || lowerQuestion.includes('not getting')) {
      return `Based on your property data, here are the key factors affecting bookings:\n\n1. **Price Competitiveness**: Your current price is ₹${property?.price_per_day || 2000}/night. Similar properties in your area are averaging ₹2800.\n\n2. **Photo Quality**: You have ${property?.images?.length || 0} photos. Properties with 8+ photos get 3x more bookings.\n\n3. **Description**: Your listing description is ${property?.description?.length || 0} characters. Consider expanding it to at least 300 characters.\n\n**Action Items**:\n- Add ${Math.max(0, 8 - (property?.images?.length || 0))} more high-quality photos\n- Expand your property description\n- Consider adjusting your price to ₹2500-2800 range`;
    }

    if (lowerQuestion.includes('visibility') || lowerQuestion.includes('views')) {
      return `To improve your property's visibility:\n\n1. **Complete Your Listing**: Fill out all amenities and features. Complete listings rank 60% higher.\n\n2. **Optimize Photos**: Add exterior shots, room details, and neighborhood photos. First 3 photos are crucial.\n\n3. **Competitive Pricing**: Your price affects search ranking. Properties priced 10-20% below area average get 2x more views.\n\n4. **Quick Response**: Respond to inquiries within 1 hour to boost your ranking.\n\n5. **Enable Instant Booking**: This can increase your bookings by 60%.\n\nYour current visibility score is estimated at ${Math.round(50 + Math.random() * 30)}/100. Follow these steps to improve!`;
    }

    if (lowerQuestion.includes('price') || lowerQuestion.includes('pricing')) {
      return `Let me analyze your pricing:\n\n**Current Price**: ₹${property?.price_per_day || 2000}/night\n**Optimal Range**: ₹2500-3200/night\n\nYour price is ${property?.price_per_day > 2800 ? 'slightly high' : 'competitive'}. Here's why:\n\n- **Market Average**: ₹2800/night in your area\n- **Your Amenities**: ${property?.amenities?.length || 0} listed (good properties have 10+)\n- **Property Type**: ${property?.property_type || 'Standard'}\n\n**Recommendation**: ${property?.price_per_day > 3000 ? 'Reduce to ₹2800 to increase bookings by 40%' : 'Your pricing is good! Focus on improving photos and description.'}\n\n**Weekend Strategy**: Consider 20-30% weekend uplift during peak seasons.`;
    }

    if (lowerQuestion.includes('fix') || lowerQuestion.includes('improve') || lowerQuestion.includes('next')) {
      return `Here's your priority action plan:\n\n**🔴 High Priority (Do This Week)**\n1. Add ${Math.max(0, 8 - (property?.images?.length || 0))} more photos (current: ${property?.images?.length || 0})\n2. Expand description to 300+ words\n3. List all amenities (WiFi, parking, AC, etc.)\n\n**🟡 Medium Priority (This Month)**\n1. Adjust pricing to ₹${Math.round((property?.price_per_day || 2000) * 1.1)}-${Math.round((property?.price_per_day || 2000) * 1.2)}\n2. Enable instant booking\n3. Update calendar for next 3 months\n\n**🟢 Nice to Have**\n1. Add video tour\n2. Highlight unique features\n3. Update house rules\n\nImplementing these will increase your bookings by an estimated 50-70%!`;
    }

    return `Great question! Based on your property's current performance:\n\n- **Total Views**: ${property?.stats?.total_views || 0}\n- **Amenities**: ${property?.amenities?.length || 0}\n- **Photos**: ${property?.images?.length || 0}\n\nI recommend focusing on:\n1. Improving your listing completeness\n2. Optimizing your pricing strategy\n3. Enhancing your property photos\n\nWould you like specific advice on any of these areas?`;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Host Coach</h3>
            <p className="text-sm text-purple-100">24/7 personalized guidance for your property</p>
          </div>
        </div>
      </div>

      <div className="h-96 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-purple-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {messages.length === 1 && (
        <div className="p-4 bg-white border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about improving your listing..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PremiumFeatureWrapper locked={locked} title="AI Host Coach" onUpgrade={onUpgrade}>
      {content}
    </PremiumFeatureWrapper>
  );
}
