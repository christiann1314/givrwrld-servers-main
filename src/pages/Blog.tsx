
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Calendar, User, ArrowRight } from 'lucide-react';

const Blog = () => {
  const blogPosts = [
    {
      id: 1,
      title: "The Future of Game Server Hosting",
      excerpt: "Exploring the latest trends and technologies shaping the game server hosting industry in 2024.",
      author: "GIVRwrld Team",
      date: "2024-01-15",
      readTime: "5 min read",
      category: "Industry News"
    },
    {
      id: 2,
      title: "How to Optimize Your Minecraft Server Performance",
      excerpt: "Tips and tricks to ensure your Minecraft server runs smoothly with maximum performance.",
      author: "Tech Team",
      date: "2024-01-10",
      readTime: "8 min read",
      category: "Tutorial"
    },
    {
      id: 3,
      title: "Rust Server Setup Guide",
      excerpt: "A comprehensive guide to setting up and configuring your Rust server for optimal gameplay.",
      author: "Community Manager",
      date: "2024-01-05",
      readTime: "12 min read",
      category: "Guide"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Forest Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/d7519b8a-ef97-4e1a-a24e-a446d044f2ac.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-blue-900/20"></div>
      </div>
      
      <div className="relative z-10">
        
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                GIVRwrld Blog
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Stay updated with the latest news, tutorials, and insights from the world of game server hosting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article key={post.id} className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                      {post.category}
                    </span>
                    <span className="text-gray-400 text-sm">{post.readTime}</span>
                  </div>
                  
                  <h2 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                    {post.title}
                  </h2>
                  
                  <p className="text-gray-300 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-400">
                      <User size={16} className="mr-2" />
                      <span>{post.author}</span>
                      <Calendar size={16} className="ml-4 mr-2" />
                      <span>{post.date}</span>
                    </div>
                    <button className="text-emerald-400 hover:text-emerald-300 transition-colors">
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default Blog;
