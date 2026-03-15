const NODE_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

const ORBITS: Array<{
  radius: number;
  className: string;
  nodeClass: string;
  linkClass: string;
  delay: string;
}> = [
  {
    radius: 78,
    className: "impact-orbit-one",
    nodeClass: "impact-node-one",
    linkClass: "impact-link-one",
    delay: "0ms",
  },
  {
    radius: 112,
    className: "impact-orbit-two",
    nodeClass: "impact-node-two",
    linkClass: "impact-link-two",
    delay: "260ms",
  },
  {
    radius: 146,
    className: "impact-orbit-three",
    nodeClass: "impact-node-three",
    linkClass: "impact-link-three",
    delay: "520ms",
  },
  {
    radius: 178,
    className: "impact-orbit-four",
    nodeClass: "impact-node-four",
    linkClass: "impact-link-four",
    delay: "760ms",
  },
];

export function ImpactNetwork() {
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-background p-3 shadow-lg shadow-primary/10">
      <div className="impact-network-scene rounded-lg border bg-gradient-to-b from-background via-accent/20 to-background">
        <div className="impact-network-tilt">
          <div className="impact-network-rotator">
            {ORBITS.map((orbit) => (
              <div key={orbit.className} className={`impact-orbit ${orbit.className}`}>
                <div className="impact-ring" />
                {NODE_ANGLES.map((angle, index) => (
                  <div key={`${orbit.className}-${angle}`}>
                    <span
                      className={`impact-link ${orbit.linkClass}`}
                      style={{
                        width: `${orbit.radius}px`,
                        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                      }}
                    />
                    <span
                      className={`impact-node ${orbit.nodeClass}`}
                      style={{
                        transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${orbit.radius}px)`,
                        animationDelay: `calc(${orbit.delay} + ${index * 80}ms)`,
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
            <div className="impact-core">
              <span className="impact-core-dot" />
              <span className="impact-core-pulse" />
            </div>
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
