const NODE_ANGLES = [0, 60, 120, 180, 240, 300];

const ORBITS: Array<{
  radius: number;
  className: string;
  nodeClass: string;
  delay: string;
}> = [
  {
    radius: 72,
    className: "impact-orbit-one",
    nodeClass: "impact-node-one",
    delay: "0ms",
  },
  {
    radius: 98,
    className: "impact-orbit-two",
    nodeClass: "impact-node-two",
    delay: "260ms",
  },
  {
    radius: 124,
    className: "impact-orbit-three",
    nodeClass: "impact-node-three",
    delay: "520ms",
  },
];

export function ImpactNetwork() {
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-background p-3 shadow-lg shadow-primary/10">
      <div className="impact-network-scene rounded-lg border bg-gradient-to-b from-background via-accent/20 to-background">
        <div className="impact-network-rotator">
          {ORBITS.map((orbit) => (
            <div key={orbit.className} className={`impact-orbit ${orbit.className}`}>
              <div className="impact-ring" />
              {NODE_ANGLES.map((angle, index) => (
                <span
                  key={`${orbit.className}-${angle}`}
                  className={`impact-node ${orbit.nodeClass}`}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${orbit.radius}px)`,
                    animationDelay: `calc(${orbit.delay} + ${index * 90}ms)`,
                  }}
                />
              ))}
            </div>
          ))}
          <div className="impact-core">
            <span className="impact-core-dot" />
            <span className="impact-core-pulse" />
          </div>
        </div>
      </div>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Every donation strengthens a connected response network — one donor
        helps multiple patients across centres in real time.
      </p>
    </div>
  );
}
