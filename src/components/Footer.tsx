import * as React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const footerSections = [
    {
      title: "Hosting",
      links: [
        { name: "Minecraft Hosting", path: "/configure/minecraft" },
        { name: "Rust Hosting", path: "/configure/rust" }, 
        { name: "Palworld Hosting", path: "/configure/palworld" }
      ]
    },
    {
      title: "Company",
      links: [
        { name: "About Us", path: "/about" },
        { name: "Blog", path: "/blog" },
        { name: "Affiliate Program", path: "/affiliate" },
        { name: "Contact", path: "/support" }
      ]
    },
    {
      title: "Support", 
      links: [
        { name: "Help Center", path: "/support" },
        { name: "Discord Server", path: "/discord" },
        { name: "Status Page", path: "/status" },
        { name: "FAQ", path: "/faq" }
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Terms of Service", path: "/terms" },
        { name: "Privacy Policy", path: "/privacy" }
      ]
    }
  ];

  return (
    <footer className="bg-gray-900/80 backdrop-blur-md border-t border-gray-700/50 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    {link.path.startsWith('#') ? (
                      <a href={link.path} className="text-gray-400 hover:text-emerald-400 transition-colors text-sm">
                        {link.name}
                      </a>
                    ) : (
                      <Link to={link.path} className="text-gray-400 hover:text-emerald-400 transition-colors text-sm">
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-700/50 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 GIVRwrld Servers. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
