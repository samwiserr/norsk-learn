import React from "react";
import { Star, Quote } from "lucide-react";

interface Testimonial {
    id: number;
    name: string;
    role: string;
    flag: string;
    text: string;
    initials: string;
    color: string;
}

const TESTIMONIALS: Testimonial[] = [
    {
        id: 1,
        name: "Sarah M.",
        role: "Student",
        flag: "🇬🇧",
        text: "The best way to learn Norsk! The AI tutor is incredibly patient and helps me practice speaking without any anxiety.",
        initials: "SM",
        color: "#8B5CF6", // Purple
    },
    {
        id: 2,
        name: "Olav K.",
        role: "Expat",
        flag: "🇩🇪",
        text: "Finally understood the V2 rule after 3 days. It feels like talking to a real person. Highly recommend.",
        initials: "OK",
        color: "#10B981", // Emerald
    },
    {
        id: 3,
        name: "Elena R.",
        role: "Student",
        flag: "🇪🇸",
        text: "Passed my A2 exam thanks to the conversation practice. The simplified mode is perfect for total beginners.",
        initials: "ER",
        color: "#F59E0B", // Amber
    },
    {
        id: 4,
        name: "Mike T.",
        role: "Pro",
        flag: "🇺🇸",
        text: "Helped me prepare for my job interview in Bergen. I feel much more confident speaking now.",
        initials: "MT",
        color: "#3B82F6", // Blue
    },
];

const TestimonialsBar = () => {
    return (
        <div className="testimonials-container">
            <div className="testimonials-track">
                {/* Double list for infinite scroll */}
                {[...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                    <div key={`${t.id}-${i}`} className="testimonial-card">
                        <div className="testimonial-card-header">
                            <div className="stars-container">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} size={16} className="star-icon" fill="#FBBF24" color="#FBBF24" />
                                ))}
                            </div>
                            <Quote size={24} className="quote-icon" />
                        </div>

                        <p className="testimonial-text">“{t.text}”</p>

                        <div className="testimonial-footer">
                            <div className="avatar-circle" style={{ backgroundColor: t.color }}>
                                {t.initials}
                            </div>
                            <div className="testimonial-author-info">
                                <span className="author-name">{t.name}</span>
                                <span className="author-role">{t.flag} {t.role}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TestimonialsBar;
