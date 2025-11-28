'use client';

import React, { useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  connections: Connection[];
  energy: number;
  maxEnergy: number;
  charging: boolean;
  breaking: boolean;
  breakTimer: number;
  alpha: number;
};

type Connection = {
  nodeA: Node;
  nodeB: Node;
  strength: number;
  age: number;
  maxAge: number;
};

type Pulse = {
  fromNode: Node;
  toNode: Node;
  progress: number;
  speed: number;
  size: number;
  alive: boolean;
};

export const ParticleNetwork = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let nodes: Node[] = [];
    let connections: Connection[] = [];
    let pulses: Pulse[] = [];
    let animationFrameId: number;
    let isVisible = true;

    // Detect mobile/tablet
    const isMobile = window.innerWidth <= 768;

    // Configuration - reduce complexity on mobile
    const config = {
      nodeCount: isMobile ? 25 : 50,
      maxConnections: isMobile ? 2 : 3,
      connectionDistance: isMobile ? 120 : 150,
      nodeSpeed: 0.3,
      pulseSpeed: 2,
      pulseChance: isMobile ? 0.003 : 0.005,
      breakChance: isMobile ? 0.001 : 0.002,
      nodeSize: { min: 2, max: isMobile ? 4 : 5 },
    };

    const getColors = () => {
      if (theme === 'dark') {
        return {
          node: '#14F593',
          nodeDim: 'rgba(20, 245, 147, 0.3)',
          connection: 'rgba(20, 245, 147, 0.15)',
          pulse: '#14F593',
          pulseGlow: 'rgba(20, 245, 147, 0.8)',
        };
      } else {
        return {
          node: '#0D8B5F',
          nodeDim: 'rgba(13, 139, 95, 0.3)',
          connection: 'rgba(13, 139, 95, 0.15)',
          pulse: '#0D8B5F',
          pulseGlow: 'rgba(13, 139, 95, 0.8)',
        };
      }
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Create a new node
    const createNode = (x?: number, y?: number): Node => ({
      x: x ?? Math.random() * canvas.width,
      y: y ?? Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * config.nodeSpeed,
      vy: (Math.random() - 0.5) * config.nodeSpeed,
      size: Math.random() * (config.nodeSize.max - config.nodeSize.min) + config.nodeSize.min,
      baseSize: 0, // Will be set after
      connections: [],
      energy: 0,
      maxEnergy: 100,
      charging: false,
      breaking: false,
      breakTimer: 0,
      alpha: 0.3 + Math.random() * 0.7,
    });

    // Create a new connection
    const createConnection = (nodeA: Node, nodeB: Node): Connection => ({
      nodeA,
      nodeB,
      strength: 1,
      age: 0,
      maxAge: 500 + Math.random() * 500,
    });

    // Create a new pulse
    const createPulse = (fromNode: Node, toNode: Node): Pulse => ({
      fromNode,
      toNode,
      progress: 0,
      speed: config.pulseSpeed,
      size: 3,
      alive: true,
    });

    // Initialize nodes
    const initNodes = () => {
      nodes = [];
      connections = [];
      pulses = [];
      for (let i = 0; i < config.nodeCount; i++) {
        const node = createNode();
        node.baseSize = node.size;
        nodes.push(node);
      }
    };

    // Update a single node
    const updateNode = (node: Node) => {
      // Move node
      node.x += node.vx;
      node.y += node.vy;

      // Bounce off edges
      if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
      if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

      // Keep in bounds
      node.x = Math.max(0, Math.min(canvas.width, node.x));
      node.y = Math.max(0, Math.min(canvas.height, node.y));

      // Handle charging
      if (node.charging) {
        node.energy += 2;
        node.size = node.baseSize + (node.energy / node.maxEnergy) * 4;

        if (node.energy >= node.maxEnergy) {
          // Discharge
          node.charging = false;
          node.energy = 0;
          node.size = node.baseSize;

          // Create pulse along connections
          node.connections.forEach(conn => {
            const targetNode = conn.nodeA === node ? conn.nodeB : conn.nodeA;
            pulses.push(createPulse(node, targetNode));
          });

          // Random chance to break connections
          if (Math.random() < 0.3) {
            node.breaking = true;
            node.connections = [];
          }
        }
      }

      // Handle breaking
      if (node.breaking) {
        node.breakTimer++;
        if (node.breakTimer > 30) {
          node.breaking = false;
          node.breakTimer = 0;
          // Boost velocity when breaking
          node.vx += (Math.random() - 0.5) * 2;
          node.vy += (Math.random() - 0.5) * 2;
        }
      }

      // Gradually slow down boosted velocity
      node.vx *= 0.99;
      node.vy *= 0.99;

      // Maintain minimum velocity
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed < config.nodeSpeed * 0.5) {
        const angle = Math.random() * Math.PI * 2;
        node.vx = Math.cos(angle) * config.nodeSpeed;
        node.vy = Math.sin(angle) * config.nodeSpeed;
      }
    };

    // Draw a single node
    const drawNode = (node: Node, colors: ReturnType<typeof getColors>) => {
      ctx.beginPath();

      // Glow effect when charging
      if (node.charging || node.energy > 0) {
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.size * 3
        );
        gradient.addColorStop(0, colors.pulseGlow);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.arc(node.x, node.y, node.size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
      }

      // Draw node
      ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
      ctx.fillStyle = node.charging ? colors.pulse : `rgba(20, 245, 147, ${node.alpha})`;
      ctx.fill();

      // Inner glow
      if (node.size > 3) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
      }
    };

    // Update a connection
    const updateConnection = (conn: Connection): boolean => {
      conn.age++;

      // Check distance
      const dx = conn.nodeB.x - conn.nodeA.x;
      const dy = conn.nodeB.y - conn.nodeA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Break if too far or too old
      if (dist > config.connectionDistance * 1.5 || conn.age > conn.maxAge) {
        conn.strength -= 0.05;
      }

      return conn.strength > 0;
    };

    // Draw a connection
    const drawConnection = (conn: Connection) => {
      const dx = conn.nodeB.x - conn.nodeA.x;
      const dy = conn.nodeB.y - conn.nodeA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const alpha = Math.min(1, (config.connectionDistance - dist) / config.connectionDistance) * conn.strength * 0.3;

      ctx.beginPath();
      ctx.moveTo(conn.nodeA.x, conn.nodeA.y);
      ctx.lineTo(conn.nodeB.x, conn.nodeB.y);
      ctx.strokeStyle = `rgba(20, 245, 147, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    // Update a pulse
    const updatePulse = (pulse: Pulse): boolean => {
      pulse.progress += pulse.speed / 100;

      if (pulse.progress >= 1) {
        pulse.alive = false;
        // Chance to trigger charging on target node
        if (Math.random() < 0.5 && !pulse.toNode.charging) {
          pulse.toNode.charging = true;
        }
      }

      return pulse.alive;
    };

    // Draw a pulse
    const drawPulse = (pulse: Pulse, colors: ReturnType<typeof getColors>) => {
      const x = pulse.fromNode.x + (pulse.toNode.x - pulse.fromNode.x) * pulse.progress;
      const y = pulse.fromNode.y + (pulse.toNode.y - pulse.fromNode.y) * pulse.progress;

      // Glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulse.size * 4);
      gradient.addColorStop(0, colors.pulseGlow);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, pulse.size * 4, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(x, y, pulse.size, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };

    // Find and create connections
    const updateConnections = () => {
      // Remove dead connections
      connections = connections.filter(conn => updateConnection(conn));

      // Remove connections from node references
      nodes.forEach(node => {
        node.connections = node.connections.filter(conn => conn.strength > 0);
      });

      // Find new connections
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].connections.length >= config.maxConnections) continue;

        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[j].connections.length >= config.maxConnections) continue;

          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < config.connectionDistance) {
            // Check if already connected
            const alreadyConnected = connections.some(conn =>
              (conn.nodeA === nodes[i] && conn.nodeB === nodes[j]) ||
              (conn.nodeA === nodes[j] && conn.nodeB === nodes[i])
            );

            if (!alreadyConnected && Math.random() < 0.02) {
              const conn = createConnection(nodes[i], nodes[j]);
              connections.push(conn);
              nodes[i].connections.push(conn);
              nodes[j].connections.push(conn);
            }
          }
        }
      }
    };

    // Random events
    const triggerRandomEvents = () => {
      // Random node starts charging
      if (Math.random() < config.pulseChance) {
        const node = nodes[Math.floor(Math.random() * nodes.length)];
        if (!node.charging && node.connections.length > 0) {
          node.charging = true;
        }
      }

      // Random connection break
      if (Math.random() < config.breakChance && connections.length > 5) {
        const conn = connections[Math.floor(Math.random() * connections.length)];
        conn.strength = 0;
        conn.nodeA.breaking = true;
        conn.nodeB.breaking = true;
      }
    };

    // Animation loop
    const animate = () => {
      if (!isVisible) return;

      const colors = getColors();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw connections
      connections.forEach(conn => drawConnection(conn));

      // Update and draw nodes
      nodes.forEach(node => {
        updateNode(node);
        drawNode(node, colors);
      });

      // Update and draw pulses
      pulses = pulses.filter(pulse => updatePulse(pulse));
      pulses.forEach(pulse => drawPulse(pulse, colors));

      // Update connections and trigger events
      updateConnections();
      triggerRandomEvents();

      animationFrameId = requestAnimationFrame(animate);
    };

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        isVisible = true;
        animate();
      }
    };

    // Setup
    const setup = () => {
      resizeCanvas();
      initNodes();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animate();
    };

    setup();

    window.addEventListener('resize', setup);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', setup);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 opacity-40 pointer-events-none"
    />
  );
};
