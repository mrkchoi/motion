import React, { useEffect, useRef, useState, Suspense } from "react";
import Lenis from "@studio-freight/lenis";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";

import Projects from "./Projects";
import Earth from "./Earth";

import "./globeNav.css";

function GlobeNav() {
  const meshRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis();

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
  }, []);

  useGSAP(() => {
    // meshRef is not loaded immediately resulting in gsap undefined target issue (setTImeout is temp fix)

    setTimeout(() => {
      gsap.registerPlugin(ScrollTrigger);

      gsap.to(meshRef?.current?.rotation, {
        y: 1,
        scrollTrigger: {
          scrub: true,
          trigger: ".globeNav__container",
          start: "start 90%",
          end: "bottom 10%",
          // markers: true,
          immediateRender: false,
        },
      });
    }, 1000);
  });

  return (
    <div className="globeNav__main">
      <div className="globeNav__container">
        <Suspense fallback={<div>Loading...</div>}>
          <Earth meshRef={meshRef} />
        </Suspense>
        <Projects />
      </div>
    </div>
  );
}

export default GlobeNav;
