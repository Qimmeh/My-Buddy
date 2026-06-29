
let px = 0, py = 0, vx = 1, vy = 1;
let w = 45, h = 45;
let bounds = { x: 0, y: 0, width: 1920, height: 1040 };
for (let i = 0; i < 2000; i++) {
    px += vx; py += vy;
    if (Math.abs(vx) > 1.2) vx *= 0.98;
    if (Math.abs(vy) > 1.2) vy *= 0.98;
    if (Math.abs(vx) < 1) vx = vx >= 0 ? 1 : -1;
    if (Math.abs(vy) < 1) vy = vy >= 0 ? 1 : -1;
    if (px <= bounds.x) { px = bounds.x; vx = Math.abs(vx); }
    else if (px + w >= bounds.x + bounds.width) { px = bounds.x + bounds.width - w; vx = -Math.abs(vx); }
    if (py <= bounds.y) { py = bounds.y; vy = Math.abs(vy); }
    else if (py + h >= bounds.y + bounds.height) { py = bounds.y + bounds.height - h; vy = -Math.abs(vy); console.log('Bounced at frame ' + i + ', new vy=' + vy); }
    if (i > 1030 && i < 1040) console.log(i, py, vy);
}

