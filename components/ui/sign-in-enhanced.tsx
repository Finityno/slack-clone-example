"use client";

import type React from "react";
import { AuthForm } from "@/components/auth/auth-form";

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  redirectTo?: string;
  mode?: "signin" | "signup";
}

const TestimonialCard = ({
  testimonial,
  delay,
}: {
  testimonial: Testimonial;
  delay: string;
}) => (
  <div
    className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`}
  >
    <img
      src={testimonial.avatarSrc}
      className="h-10 w-10 object-cover rounded-2xl"
      alt="avatar"
    />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>
);

export const SignInPageEnhanced: React.FC<SignInPageProps> = ({
  heroImageSrc = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600&q=80",
  testimonials = [
    {
      avatarSrc: "https://i.pravatar.cc/150?img=1",
      name: "Sarah Johnson",
      handle: "@sarahj",
      text: "This platform has completely transformed how we manage our projects.",
    },
    {
      avatarSrc: "https://i.pravatar.cc/150?img=2",
      name: "Mike Chen",
      handle: "@mikechen",
      text: "Incredible experience! The authentication is seamless and secure.",
    },
  ],
  redirectTo = "/dashboard",
  mode = "signin",
}) => {
  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
      <section className="flex-1 flex items-center justify-center p-8">
        <AuthForm mode={mode} redirectTo={redirectTo} />
      </section>

      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          ></div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <TestimonialCard
                testimonial={testimonials[0]}
                delay="animate-delay-1000"
              />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard
                    testimonial={testimonials[1]}
                    delay="animate-delay-1200"
                  />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:flex">
                  <TestimonialCard
                    testimonial={testimonials[2]}
                    delay="animate-delay-1400"
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
