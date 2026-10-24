/**
 * Practice problem templates. Each make(R) returns a fresh problem with random values.
 * type: num (numeric) | mc (multiple choice) | multi (pick every force) | free (written, self-checked)
 */
const g = 9.8;
const f = (x, d = 2) => Number(x.toFixed(d)).toString();

export const TOPICS = {
  forces: "Forces", fbd: "Free-body diagrams", newton: "Newton's laws", friction: "Friction", com: "Center of mass",
  torque: "Torque", rotation: "Rotation", kinematics: "Kinematics", drag: "Air resistance", graphs: "Graphs",
  energy: "Energy", momentum: "Momentum and impulse", multi: "Multi-step AP"
};

const FBD_CHOICES = ["Weight (gravity, down)", "Normal force from the floor (up)", "Friction from the floor", "Air drag", "A forward \"force of motion\"", "Force from the legs (internal)", "Push from the wall", "Net force m·a"];

export const PROBLEMS = [
  // ---------- forces ----------
  { id: "f-weight", topic: "forces", level: 1, related: "f-mars", make: R => { const m = R.int(40, 95); return {
    prompt: `What is the weight of a ${m} kg person on Earth?`, givens: [["m", `${m} kg`], ["g", "9.8 m/s²"]], answer: m * g, unit: "N",
    hint: "Weight is a force: multiply mass by g.", steps: [`F<sub>g</sub> = m·g = ${m} × 9.8 = ${f(m * g, 1)} N`],
    wrong: [{ v: m, why: "That is the mass in kg. Weight is a force in newtons: multiply by g." }, { v: m * 10, why: "You used g = 10 m/s². This lab uses 9.8 m/s²." }] }; } },
  { id: "f-mars", topic: "forces", level: 1, related: "f-weight", make: R => { const W = R.int(150, 400); return {
    prompt: `A robot weighs ${W} N on Mars (g = 3.71 m/s²). What is its mass?`, givens: [["F<sub>g</sub>", `${W} N`], ["g", "3.71 m/s²"]], answer: W / 3.71, unit: "kg",
    hint: "m = F<sub>g</sub>/g, using Mars's g.", steps: [`m = F<sub>g</sub>/g = ${W}/3.71 = ${f(W / 3.71, 1)} kg`, "Mass is the same on every planet."],
    wrong: [{ v: W / g, why: "You used Earth's g. The weight was measured on Mars." }] }; } },
  { id: "f-elev-up", topic: "forces", level: 2, related: "f-elev-slow", make: R => { const m = R.int(45, 90), a = R.num(0.5, 3, 0.1); return {
    prompt: `A ${m} kg student stands on a scale in an elevator accelerating upward at ${a} m/s². What does the scale read?`, givens: [["m", `${m} kg`], ["a", `${a} m/s² up`]], answer: m * (g + a), unit: "N",
    hint: "The scale reads the normal force. Write ΣF<sub>y</sub> = m·a<sub>y</sub> with up positive.", steps: ["Up +: N − m·g = m·a", `N = m(g + a) = ${m}(9.8 + ${a}) = ${f(m * (g + a), 0)} N`],
    wrong: [{ v: m * g, why: "N = mg only when a<sub>y</sub> = 0." }, { v: m * (g - a), why: "Sign error: the acceleration is upward, so N must be larger than mg." }] }; } },
  { id: "f-elev-slow", topic: "forces", level: 2, related: "f-elev-up", make: R => { const m = R.int(45, 90), a = R.num(0.5, 3, 0.1); return {
    prompt: `An elevator moving <b>downward</b> slows down at ${a} m/s². What does a scale under a ${m} kg passenger read?`, givens: [["m", `${m} kg`], ["slowing while moving down", `${a} m/s²`]], answer: m * (g + a), unit: "N",
    hint: "Slowing down while moving down means the acceleration points up.", steps: ["Velocity down, slowing → acceleration up: a<sub>y</sub> = +" + a, `N = m(g + a) = ${f(m * (g + a), 0)} N`],
    wrong: [{ v: m * (g - a), why: "The acceleration points opposite the velocity when slowing down: here it is up, not down." }] }; } },
  { id: "f-rail", topic: "forces", level: 2, related: "f-elev-up", make: R => { const m = R.int(50, 90), F = R.int(50, 200); return {
    prompt: `A ${m} kg person stands still and pulls straight up on a railing; the railing pulls them up with ${F} N. What is the normal force from the floor?`, givens: [["m", `${m} kg`], ["F", `${F} N up`]], answer: m * g - F, unit: "N",
    hint: "Three vertical forces: N, F and the weight. ΣF<sub>y</sub> = 0.", steps: ["N + F − m·g = 0", `N = ${f(m * g, 0)} − ${F} = ${f(m * g - F, 0)} N`],
    wrong: [{ v: m * g + F, why: "The railing helps hold the person up, so the floor pushes less, not more." }, { v: m * g, why: "N is not always mg: the railing's force also counts." }] }; } },
  { id: "f-zero-g", topic: "forces", level: 3, related: "f-elev-up", make: R => ({
    prompt: "With what acceleration must an elevator move so that a scale under a passenger reads zero?", type: "mc",
    choices: ["9.8 m/s² upward", "9.8 m/s² downward", "Any constant velocity", "It is impossible"], answer: 1,
    hint: "Set N = 0 in N − mg = m·a.", steps: ["N − mg = m·a with N = 0 → a = −g", "The elevator (and passenger) must be in free fall."],
    whys: ["Upward acceleration makes the scale read more.", "", "Constant velocity gives a = 0, so the scale reads mg.", "It happens in free fall; that's why astronauts in orbit feel weightless."] }) },
  { id: "f-ramp", topic: "forces", level: 3, related: "fr-ramp", make: R => { const m = R.int(50, 85), th = R.int(8, 25); return {
    prompt: `A ${m} kg person stands still on a ramp tilted ${th}°. What is the normal force on them?`, givens: [["m", `${m} kg`], ["θ", `${th}°`]], answer: m * g * Math.cos(th * Math.PI / 180), unit: "N",
    hint: "Tilt the axes along the ramp. Only the component of gravity perpendicular to the ramp is balanced by N.", steps: [`N = m·g·cos θ = ${m} × 9.8 × cos ${th}° = ${f(m * g * Math.cos(th * Math.PI / 180), 0)} N`],
    wrong: [{ v: m * g, why: "On a slope only m·g·cos θ presses into the surface." }, { v: m * g * Math.sin(th * Math.PI / 180), why: "m·g·sin θ is the component along the ramp, which friction balances." }] }; } },

  // ---------- free-body diagrams ----------
  { id: "b-stand", topic: "fbd", level: 1, related: "b-slip", make: () => ({ type: "multi", prompt: "A person stands still on a flat floor. Select every force acting on the person.", choices: FBD_CHOICES, answer: [0, 1],
    hint: "Only real pushes and pulls by other objects. Nothing pushes sideways.", steps: ["Earth pulls down (weight).", "The floor pushes up (normal force).", "No sideways push, so no friction is needed."],
    whys: { 2: "Friction only appears if something tries to slide the feet.", 4: "There is no \"force of motion\".", 5: "Leg muscles are internal forces; they never appear on a whole-body diagram.", 7: "m·a is the result of the forces, not a force." } }) },
  { id: "b-fall", topic: "fbd", level: 1, related: "b-top", make: () => ({ type: "multi", prompt: "A person falls freely through the air (ignore air resistance). Select every force acting on them.", choices: FBD_CHOICES, answer: [0],
    hint: "What is still touching them?", steps: ["Nothing touches them, so the only force is gravity."],
    whys: { 1: "No floor contact, so no normal force.", 4: "Moving down doesn't need a downward \"force of motion\" beyond gravity.", 7: "Net force is not an extra force." } }) },
  { id: "b-slip", topic: "fbd", level: 2, related: "b-wall", make: () => ({ type: "multi", prompt: "A person slides to the right across a floor on their shoes, slowing down. Select every force on them.", choices: FBD_CHOICES, answer: [0, 1, 2],
    hint: "Sliding means kinetic friction from the floor, opposite the sliding.", steps: ["Weight down, normal force up.", "Kinetic friction from the floor points left (opposite the sliding).", "No forward force: they keep moving because of inertia."],
    whys: { 4: "The most common FBD mistake: motion continues without a forward force (Newton's first law)." } }) },
  { id: "b-wall", topic: "fbd", level: 2, related: "b-slip", make: () => ({ type: "multi", prompt: "A person stands still and pushes horizontally on a wall in front of them. Select every force on the person.", choices: FBD_CHOICES, answer: [0, 1, 2, 6],
    hint: "Third law: the wall pushes back on the person. Something must balance that.", steps: ["Weight and normal force (vertical).", "The wall pushes the person backward.", "Static friction from the floor pushes them forward and balances it."],
    whys: { 5: "Their push on the wall acts on the wall, not on them." } }) },
  { id: "b-top", topic: "fbd", level: 2, related: "b-fall", make: () => ({ type: "multi", prompt: "A person who jumped straight up is at the very top of the jump. Select every force on them (ignore air).", choices: FBD_CHOICES, answer: [0],
    hint: "Velocity being zero doesn't remove any force.", steps: ["Only gravity acts. a = g down even though v = 0 for an instant."] }) },
  { id: "b-terminal", topic: "fbd", level: 3, related: "d-lin", make: () => ({ type: "multi", prompt: "A skydiver falls at constant terminal speed. Select every force on them.", choices: FBD_CHOICES, answer: [0, 3],
    hint: "Constant velocity means ΣF = 0. What balances gravity?", steps: ["Weight down and air drag up, equal in size, so ΣF = 0."] }) },

  // ---------- Newton ----------
  { id: "n-basic", topic: "newton", level: 1, related: "n-comp", make: R => { const m = R.int(40, 90), F1 = R.int(150, 400), F2 = R.int(30, 140); return {
    prompt: `A ${m} kg skater on frictionless ice is pushed right with ${F1} N while wind pushes left with ${F2} N. Acceleration?`, givens: [["m", `${m} kg`], ["F₁", `${F1} N right`], ["F₂", `${F2} N left`]], answer: (F1 - F2) / m, unit: "m/s²",
    hint: "Add the forces with signs first.", steps: [`ΣF = ${F1} − ${F2} = ${F1 - F2} N`, `a = ΣF/m = ${f((F1 - F2) / m)} m/s² to the right`],
    wrong: [{ v: (F1 + F2) / m, why: "The forces point in opposite directions, so subtract." }, { v: F1 / m, why: "You left out the wind's force." }] }; } },
  { id: "n-comp", topic: "newton", level: 2, related: "n-basic", make: R => { const m = R.int(20, 60), F = R.int(100, 300), th = R.pick([20, 30, 37, 45]); const ax = F * Math.cos(th * Math.PI / 180) / m; return {
    prompt: `A ${m} kg sled on frictionless snow is pulled with ${F} N by a rope ${th}° above horizontal. Horizontal acceleration?`, givens: [["m", `${m} kg`], ["F", `${F} N`], ["θ", `${th}°`]], answer: ax, unit: "m/s²",
    hint: "Only the horizontal component of the rope's force speeds it up horizontally.", steps: [`Fₓ = F cos θ = ${f(F * Math.cos(th * Math.PI / 180), 1)} N`, `aₓ = Fₓ/m = ${f(ax)} m/s²`],
    wrong: [{ v: F / m, why: "Use the horizontal component F cos θ, not the whole force." }, { v: F * Math.sin(th * Math.PI / 180) / m, why: "sin θ gives the vertical component here." }] }; } },
  { id: "n-third", topic: "newton", level: 1, related: "n-basic", make: () => ({ type: "mc", prompt: "A person stands on the floor. What is the third-law partner of the person's weight?",
    choices: ["The floor's normal force on the person", "The person's gravitational pull on Earth", "The person's push on the floor", "There is none"], answer: 1,
    hint: "A third-law pair has the same type of force and swaps the two objects.", steps: ["Weight = Earth pulls the person (gravity).", "Partner: the person pulls Earth (gravity), equal and opposite."],
    whys: ["Both act on the person and are different types of force: they balance, but they are not a pair.", "", "That is the partner of the normal force.", "Every force has a partner."] }) },
  { id: "n-atwood", topic: "newton", level: 3, related: "n-table", make: R => { const m1 = R.int(2, 6), m2 = m1 + R.int(1, 5); const a = (m2 - m1) * g / (m1 + m2); return {
    prompt: `Masses ${m1} kg and ${m2} kg hang on either side of a light, frictionless pulley. What is the size of their acceleration?`, givens: [["m₁", `${m1} kg`], ["m₂", `${m2} kg`]], answer: a, unit: "m/s²",
    hint: "Treat both masses as one system: the net force is the difference in weights; the mass being accelerated is the total.", steps: [`ΣF = (m₂ − m₁)g = ${f((m2 - m1) * g, 1)} N`, `a = ΣF/(m₁ + m₂) = ${f(a)} m/s²`],
    wrong: [{ v: (m2 - m1) * g / m2, why: "Both masses accelerate, so divide by the total mass." }] }; } },
  { id: "n-table", topic: "newton", level: 4, related: "n-atwood", make: R => { const m1 = R.int(3, 8), m2 = R.int(2, 6), mu = R.num(0.1, 0.3, 0.05); const a = (m2 * g - mu * m1 * g) / (m1 + m2); return a <= 0.2 ? null : {
    prompt: `A ${m1} kg block on a table (μk = ${mu}) is tied over a pulley to a hanging ${m2} kg block. Acceleration of the blocks?`, givens: [["m₁ (table)", `${m1} kg`], ["m₂ (hanging)", `${m2} kg`], ["μk", mu]], answer: a, unit: "m/s²",
    hint: "System approach: driving force m₂g, resisting force μk·m₁g, total mass m₁ + m₂.", steps: [`Net = m₂g − μk m₁g = ${f(m2 * g, 1)} − ${f(mu * m1 * g, 1)} = ${f(m2 * g - mu * m1 * g, 1)} N`, `a = ${f(m2 * g - mu * m1 * g, 1)}/${m1 + m2} = ${f(a)} m/s²`],
    wrong: [{ v: m2 * g / (m1 + m2), why: "You left out friction on the table block." }] }; } },
  { id: "n-contact", topic: "newton", level: 3, related: "n-basic", make: R => { const m1 = R.int(5, 15), m2 = R.int(5, 15), F = R.int(40, 120); return {
    prompt: `On frictionless ice you push a ${m1} kg box with ${F} N, and it pushes a ${m2} kg box in front of it. Force between the boxes?`, givens: [["m₁", `${m1} kg`], ["m₂", `${m2} kg`], ["F", `${F} N`]], answer: m2 * F / (m1 + m2), unit: "N",
    hint: "Find a for both boxes together, then apply ΣF = m·a to the front box alone.", steps: [`a = ${F}/${m1 + m2} = ${f(F / (m1 + m2))} m/s²`, `Front box: P = m₂·a = ${f(m2 * F / (m1 + m2), 1)} N`],
    wrong: [{ v: F, why: "The front box doesn't feel your whole push: part of it accelerates the back box." }] }; } },

  // ---------- friction ----------
  { id: "fr-max", topic: "friction", level: 1, related: "fr-slip", make: R => { const m = R.int(45, 90), mu = R.num(0.2, 0.9, 0.05); return {
    prompt: `A ${m} kg person stands on a floor with μs = ${mu}. What is the largest sideways force static friction can supply?`, givens: [["m", `${m} kg`], ["μs", mu]], answer: mu * m * g, unit: "N",
    hint: "f<sub>s,max</sub> = μs·N, with N = m·g on flat ground.", steps: [`N = ${f(m * g, 0)} N`, `f<sub>s,max</sub> = ${mu} × ${f(m * g, 0)} = ${f(mu * m * g, 0)} N`],
    wrong: [{ v: mu * m, why: "Multiply μ by the normal force (newtons), not the mass." }] }; } },
  { id: "fr-slip", topic: "friction", level: 2, related: "fr-max", make: R => { const m = R.int(50, 80), muS = R.num(0.3, 0.8, 0.05), muK = +(muS - 0.1).toFixed(2), F = R.int(100, 500); const holds = F <= muS * m * g; return {
    prompt: `A ${m} kg person (μs = ${muS}, μk = ${muK}) is shoved sideways with ${F} N. What is the size of the friction force on them?`, givens: [["m", `${m} kg`], ["μs", muS], ["μk", muK], ["F", `${F} N`]], answer: holds ? F : muK * m * g, unit: "N",
    hint: "First compare the push with μs·N. Static friction only matches the push if the push is smaller.", steps: [`μs·N = ${f(muS * m * g, 0)} N`, holds ? `${F} N ≤ ${f(muS * m * g, 0)} N: static friction matches the push, f = ${F} N` : `${F} N > ${f(muS * m * g, 0)} N: the feet slide, f = μk·N = ${f(muK * m * g, 0)} N`],
    wrong: [{ v: muS * m * g, why: holds ? "μs·N is only the maximum. Static friction is just as big as needed." : "Once sliding, use μk." }] }; } },
  { id: "fr-decel", topic: "friction", level: 1, related: "fr-stop", make: R => { const mu = R.num(0.1, 0.6, 0.05); return {
    prompt: `A person slides on their shoes across a floor with μk = ${mu}. What is the size of their deceleration?`, givens: [["μk", mu]], answer: mu * g, unit: "m/s²",
    hint: "f = μk·m·g, then divide by m.", steps: [`a = μk·g = ${mu} × 9.8 = ${f(mu * g)} m/s²`, "The mass cancels."] }; } },
  { id: "fr-stop", topic: "friction", level: 2, related: "fr-decel", make: R => { const v = R.num(1.5, 5, 0.5), mu = R.num(0.1, 0.5, 0.05), d = v * v / (2 * mu * g); return {
    prompt: `A person sliding at ${v} m/s hits a patch with μk = ${mu}. How far do they slide before stopping?`, givens: [["v₀", `${v} m/s`], ["μk", mu]], answer: d, unit: "m",
    hint: "Find a = −μk·g, then use v² = v₀² + 2aΔx.", steps: [`a = −${f(mu * g)} m/s²`, `0 = ${v}² − 2(${f(mu * g)})Δx → Δx = ${f(d)} m`],
    wrong: [{ v: v * v / (mu * g), why: "You forgot the 2 in v² = v₀² + 2aΔx." }] }; } },
  { id: "fr-ramp", topic: "friction", level: 3, related: "f-ramp", make: R => { const th = R.int(10, 35); return {
    prompt: `What minimum coefficient of static friction lets a person stand without slipping on a ${th}° slope?`, givens: [["θ", `${th}°`]], answer: Math.tan(th * Math.PI / 180), unit: "",
    hint: "Friction must balance m·g·sin θ, and the most it can be is μs·m·g·cos θ.", steps: ["μs·m·g·cos θ ≥ m·g·sin θ", `μs ≥ tan θ = tan ${th}° = ${f(Math.tan(th * Math.PI / 180), 3)}`] }; } },
  { id: "fr-accel", topic: "friction", level: 3, related: "fr-slip", make: R => { const m = R.int(40, 80), muK = R.num(0.1, 0.3, 0.05), F = Math.round(m * g * muK + R.int(50, 200)); return {
    prompt: `A ${m} kg person on a floor (μk = ${muK}) is pushed with a steady ${F} N while sliding. Acceleration?`, givens: [["m", `${m} kg`], ["μk", muK], ["F", `${F} N`]], answer: (F - muK * m * g) / m, unit: "m/s²",
    hint: "Net force = push − kinetic friction.", steps: [`f<sub>k</sub> = ${f(muK * m * g, 1)} N`, `a = (${F} − ${f(muK * m * g, 1)})/${m} = ${f((F - muK * m * g) / m)} m/s²`],
    wrong: [{ v: F / m, why: "Friction still acts while sliding." }] }; } },
  { id: "fr-tip", topic: "friction", level: 3, related: "x-tipslip", make: R => { const m = R.int(50, 80), b = R.num(0.2, 0.3, 0.01), hgt = R.num(0.9, 1.4, 0.1); return {
    prompt: `Model a ${m} kg person as a rigid block with base ${b} m wide (COM centered). A horizontal push at ${hgt} m height: what push starts tipping (if the feet don't slide)?`, givens: [["m", `${m} kg`], ["b", `${b} m`], ["h", `${hgt} m`]], answer: m * g * (b / 2) / hgt, unit: "N",
    hint: "Torques about the front edge: F·h against m·g·(b/2).", steps: [`F·h = m·g·(b/2) → F = ${f(m * g, 0)} × ${f(b / 2, 3)}/${hgt} = ${f(m * g * b / 2 / hgt, 1)} N`],
    wrong: [{ v: m * g * b / hgt, why: "The COM is at the middle: its lever arm is b/2." }] }; } },

  // ---------- center of mass ----------
  { id: "c-two", topic: "com", level: 1, related: "c-pack", make: R => { const m1 = R.int(2, 10), m2 = R.int(2, 10), L = R.num(0.5, 2, 0.1); return {
    prompt: `A ${m1} kg mass sits at x = 0 and a ${m2} kg mass at x = ${L} m. Where is the center of mass?`, givens: [["m₁", `${m1} kg at 0`], ["m₂", `${m2} kg at ${L} m`]], answer: m2 * L / (m1 + m2), unit: "m",
    hint: "x = Σmx/Σm.", steps: [`x = (${m1}·0 + ${m2}·${L})/(${m1 + m2}) = ${f(m2 * L / (m1 + m2), 3)} m`],
    wrong: [{ v: L / 2, why: "That ignores the masses; weight each position by its mass." }] }; } },
  { id: "c-pack", topic: "com", level: 2, related: "c-two", make: R => { const M = R.int(50, 80), mp = R.int(5, 15), d = R.num(0.15, 0.3, 0.01); return {
    prompt: `A ${M} kg person (COM above the ankles, x = 0) puts on a ${mp} kg backpack whose center is ${d} m behind them. How far back does the combined COM move?`, givens: [["M", `${M} kg`], ["m<sub>pack</sub>", `${mp} kg`], ["d", `${d} m`]], answer: mp * d / (M + mp), unit: "m",
    hint: "Combine the two: x = (M·0 + m·(−d))/(M + m).", steps: [`x = ${mp} × ${d}/${M + mp} = ${f(mp * d / (M + mp), 3)} m behind the ankles`] }; } },
  { id: "c-lean", topic: "com", level: 3, related: "t-grav", make: R => { const hc = R.num(0.9, 1.1, 0.01), d = R.num(0.15, 0.22, 0.01); return {
    prompt: `A person's COM is ${hc} m above their ankles and their toes are ${d} m in front of the ankles. Leaning stiffly from the ankles, at what angle does the COM pass over the toes?`, givens: [["COM height", `${hc} m`], ["toe distance", `${d} m`]], answer: Math.asin(d / hc) * 180 / Math.PI, unit: "°",
    hint: "The COM's horizontal shift is (height)·sin θ.", steps: [`sin θ = ${d}/${hc} → θ = ${f(Math.asin(d / hc) * 180 / Math.PI, 1)}°`], tol: 0.03 }; } },
  { id: "c-arms", topic: "com", level: 2, related: "c-pack", make: () => ({ type: "mc", prompt: "A person standing straight raises both arms straight forward. How does their center of mass move?",
    choices: ["Forward and up", "Backward and down", "It doesn't move: the body's total mass is the same", "Straight down"], answer: 0,
    hint: "The COM is a mass-weighted average of where the parts are.", steps: ["The arms' mass moves forward and up, so the weighted average moves forward and up (by a few cm)."],
    whys: ["", "", "The total mass is the same, but where it is changed.", ""] }) },

  // ---------- torque ----------
  { id: "t-basic", topic: "torque", level: 1, related: "t-angle", make: R => { const r = R.num(0.5, 1.5, 0.1), F = R.int(50, 300); return {
    prompt: `A ${F} N horizontal push acts ${r} m directly above a pivot. Torque about the pivot?`, givens: [["r", `${r} m`], ["F", `${F} N`], ["angle", "90°"]], answer: r * F, unit: "N·m",
    hint: "τ = rF sin θ with θ = 90°.", steps: [`τ = ${r} × ${F} × 1 = ${f(r * F, 1)} N·m`] }; } },
  { id: "t-angle", topic: "torque", level: 1, related: "t-basic", make: R => { const r = R.num(0.5, 1.5, 0.1), F = R.int(50, 300), th = R.pick([30, 45, 60, 120, 150]); return {
    prompt: `A ${F} N force acts ${r} m from a pivot, at ${th}° to the position vector. Size of the torque?`, givens: [["r", `${r} m`], ["F", `${F} N`], ["θ", `${th}°`]], answer: r * F * Math.sin(th * Math.PI / 180), unit: "N·m",
    hint: "τ = rF sin θ.", steps: [`τ = ${r} × ${F} × sin ${th}° = ${f(r * F * Math.sin(th * Math.PI / 180), 1)} N·m`],
    wrong: [{ v: r * F * Math.cos(th * Math.PI / 180), why: "Use sin θ, where θ is between r and F." }, { v: r * F, why: "That assumes 90°." }] }; } },
  { id: "t-grav", topic: "torque", level: 2, related: "t-hold", make: R => { const m = R.int(50, 90), d = R.num(0.02, 0.15, 0.01); return {
    prompt: `A ${m} kg person's COM is ${d} m horizontally in front of their toes. Size of gravity's torque about the toes?`, givens: [["m", `${m} kg`], ["d", `${d} m`]], answer: m * g * d, unit: "N·m",
    hint: "τ = m·g·d, with d the horizontal lever arm.", steps: [`τ = ${m} × 9.8 × ${d} = ${f(m * g * d, 1)} N·m`],
    wrong: [{ v: m * d, why: "Torque needs a force: use the weight m·g." }] }; } },
  { id: "t-hold", topic: "torque", level: 3, related: "t-grav", make: R => { const m = R.int(50, 90), d = R.num(0.03, 0.12, 0.01), hh = R.num(1.0, 1.5, 0.1); return {
    prompt: `A ${m} kg person leans so their COM is ${d} m past their toes. What horizontal backward force at shoulder height (${hh} m) stops them from tipping?`, givens: [["m", `${m} kg`], ["d", `${d} m`], ["h", `${hh} m`]], answer: m * g * d / hh, unit: "N",
    hint: "Balance torques about the toes: F·h = m·g·d.", steps: [`F = m·g·d/h = ${f(m * g * d, 1)}/${hh} = ${f(m * g * d / hh, 1)} N`] }; } },
  { id: "t-net", topic: "torque", level: 2, related: "t-angle", make: R => { const F1 = R.int(50, 200), r1 = R.num(0.2, 1, 0.1), F2 = R.int(50, 200), r2 = R.num(0.2, 1, 0.1); return {
    prompt: `On a pivot, force 1 (${F1} N at ${r1} m, perpendicular) turns it clockwise; force 2 (${F2} N at ${r2} m, perpendicular) turns it counterclockwise. Net torque, clockwise positive?`, givens: [["τ₁", `${F1} N × ${r1} m cw`], ["τ₂", `${F2} N × ${r2} m ccw`]], answer: F1 * r1 - F2 * r2, unit: "N·m",
    hint: "Give each torque a sign, then add.", steps: [`Στ = ${f(F1 * r1, 1)} − ${f(F2 * r2, 1)} = ${f(F1 * r1 - F2 * r2, 1)} N·m`],
    wrong: [{ v: F1 * r1 + F2 * r2, why: "Opposite rotation directions must have opposite signs." }] }; } },
  { id: "t-zero", topic: "torque", level: 2, related: "t-basic", make: () => ({ type: "mc", prompt: "Which push on a person produces zero torque about their toes?",
    choices: ["A horizontal push at the shoulders", "A push whose line of action passes through the toes", "A vertical push at the shoulders", "A push at the head"], answer: 1,
    hint: "Torque = force × perpendicular distance from the pivot to the line of action.", steps: ["If the line of action goes through the pivot, the lever arm is zero, so τ = 0 for any force size."] }) },

  // ---------- rotation ----------
  { id: "r-alpha", topic: "rotation", level: 1, related: "r-rodend", make: R => { const tau = R.int(50, 300), I = R.int(20, 90); return {
    prompt: `A net torque of ${tau} N·m acts on a body with I = ${I} kg·m² about the pivot. Angular acceleration?`, givens: [["Στ", `${tau} N·m`], ["I", `${I} kg·m²`]], answer: tau / I, unit: "rad/s²",
    hint: "Στ = I·α.", steps: [`α = ${tau}/${I} = ${f(tau / I)} rad/s²`] }; } },
  { id: "r-rodend", topic: "rotation", level: 2, related: "r-parallel", make: R => { const m = R.int(50, 90), L = R.num(1.5, 1.9, 0.05); return {
    prompt: `Model a ${m} kg, ${L} m person as a uniform rod pivoting about one end. Moment of inertia?`, givens: [["m", `${m} kg`], ["L", `${L} m`]], answer: m * L * L / 3, unit: "kg·m²",
    hint: "Rod about its end: mL²/3.", steps: [`I = ${m} × ${L}²/3 = ${f(m * L * L / 3, 1)} kg·m²`],
    wrong: [{ v: m * L * L / 12, why: "mL²/12 is about the center, not the end." }] }; } },
  { id: "r-parallel", topic: "rotation", level: 2, related: "r-rodend", make: R => { const m = R.int(50, 90), Icm = R.int(10, 25), d = R.num(0.8, 1.1, 0.05); return {
    prompt: `A body has I<sub>COM</sub> = ${Icm} kg·m², mass ${m} kg, and its COM is ${d} m from the toe. I about the toe?`, givens: [["I<sub>COM</sub>", `${Icm} kg·m²`], ["m", `${m} kg`], ["d", `${d} m`]], answer: Icm + m * d * d, unit: "kg·m²",
    hint: "Parallel-axis theorem.", steps: [`I = ${Icm} + ${m} × ${d}² = ${f(Icm + m * d * d, 1)} kg·m²`] }; } },
  { id: "r-tipstart", topic: "rotation", level: 3, related: "r-fall", make: R => { const L = R.num(1.6, 1.9, 0.05), th = R.int(10, 30); return {
    prompt: `A uniform rod of length ${L} m stands on one end (fixed pivot) tilted ${th}° from vertical. Angular acceleration just after release?`, givens: [["L", `${L} m`], ["θ", `${th}°`]], answer: 1.5 * g / L * Math.sin(th * Math.PI / 180), unit: "rad/s²",
    hint: "τ = m·g·(L/2)·sin θ and I = mL²/3; the mass cancels.", steps: ["α = m·g·(L/2)sin θ / (mL²/3) = (3g/2L)·sin θ", `α = ${f(1.5 * g / L * Math.sin(th * Math.PI / 180))} rad/s²`] }; } },
  { id: "r-fall", topic: "rotation", level: 3, related: "r-tipstart", make: R => { const L = R.num(1.6, 1.9, 0.05); return {
    prompt: `A uniform ${L} m rod balanced on its end tips over from (nearly) vertical, pivot fixed. Speed of its top end when it hits the ground?`, givens: [["L", `${L} m`]], answer: Math.sqrt(3 * g * L), unit: "m/s",
    hint: "Energy: m·g·(L/2) = ½(mL²/3)ω², then v = ωL.", steps: ["ω² = 3g/L", `v<sub>top</sub> = ωL = √(3gL) = ${f(Math.sqrt(3 * g * L))} m/s`],
    wrong: [{ v: Math.sqrt(2 * g * L), why: "That is free fall from height L. The rod's top moves faster because rotation shares the energy differently." }] }; } },
  { id: "r-L", topic: "rotation", level: 2, related: "r-alpha", make: R => { const I = R.int(5, 40), w = R.num(1, 5, 0.5); return {
    prompt: `A body with I = ${I} kg·m² spins at ${w} rad/s. Angular momentum and rotational kinetic energy? Enter the kinetic energy.`, givens: [["I", `${I} kg·m²`], ["ω", `${w} rad/s`]], answer: 0.5 * I * w * w, unit: "J",
    hint: "K = ½Iω² (and L = Iω).", steps: [`L = ${f(I * w, 1)} kg·m²/s`, `K = ½ × ${I} × ${w}² = ${f(0.5 * I * w * w, 1)} J`],
    wrong: [{ v: I * w, why: "That is L, the angular momentum." }] }; } },

  // ---------- kinematics ----------
  { id: "k-time", topic: "kinematics", level: 1, related: "k-speed", make: R => { const hh = R.num(0.5, 10, 0.5); return {
    prompt: `How long does a fall from rest through ${hh} m take (no air)?`, givens: [["h", `${hh} m`]], answer: Math.sqrt(2 * hh / g), unit: "s",
    hint: "h = ½gt².", steps: [`t = √(2h/g) = √(${2 * hh}/9.8) = ${f(Math.sqrt(2 * hh / g), 3)} s`],
    wrong: [{ v: hh / g, why: "Solve h = ½gt² for t: you need a square root." }] }; } },
  { id: "k-speed", topic: "kinematics", level: 1, related: "k-time", make: R => { const hh = R.num(0.5, 10, 0.5); return {
    prompt: `Speed after falling ${hh} m from rest (no air)?`, givens: [["h", `${hh} m`]], answer: Math.sqrt(2 * g * hh), unit: "m/s",
    hint: "v² = v₀² + 2gh.", steps: [`v = √(2 × 9.8 × ${hh}) = ${f(Math.sqrt(2 * g * hh))} m/s`] }; } },
  { id: "k-dist", topic: "kinematics", level: 1, related: "k-time", make: R => { const t = R.num(0.2, 1.5, 0.1); return {
    prompt: `How far does a person fall from rest in ${t} s?`, givens: [["t", `${t} s`]], answer: 0.5 * g * t * t, unit: "m",
    hint: "d = ½gt².", steps: [`d = ½ × 9.8 × ${t}² = ${f(0.5 * g * t * t, 3)} m`], wrong: [{ v: g * t * t, why: "Don't forget the ½." }, { v: g * t, why: "That is the speed, not the distance." }] }; } },
  { id: "k-max", topic: "kinematics", level: 2, related: "k-airtime", make: R => { const v = R.num(1.5, 4, 0.1); return {
    prompt: `A person jumps straight up at ${v} m/s. How high does their COM rise?`, givens: [["v₀", `${v} m/s`]], answer: v * v / (2 * g), unit: "m",
    hint: "At the top v = 0: 0 = v₀² − 2gh.", steps: [`h = v₀²/2g = ${f(v * v / (2 * g), 3)} m`] }; } },
  { id: "k-airtime", topic: "kinematics", level: 2, related: "k-max", make: R => { const v = R.num(1.5, 4, 0.1); return {
    prompt: `A person jumps straight up at ${v} m/s and lands at the same height. How long are they in the air?`, givens: [["v₀", `${v} m/s`]], answer: 2 * v / g, unit: "s",
    hint: "Time up = v₀/g; the trip down takes the same time.", steps: [`t = 2v₀/g = ${f(2 * v / g, 3)} s`], wrong: [{ v: v / g, why: "That's only the way up." }] }; } },
  { id: "k-ledge", topic: "kinematics", level: 3, related: "k-time", make: R => { const vx = R.num(1, 4, 0.5), hh = R.num(0.5, 3, 0.5); return {
    prompt: `A person runs off a ${hh} m ledge horizontally at ${vx} m/s. How far from the ledge do they land?`, givens: [["vₓ", `${vx} m/s`], ["h", `${hh} m`]], answer: vx * Math.sqrt(2 * hh / g), unit: "m",
    hint: "Vertical motion sets the time (same as a drop); horizontal velocity stays constant.", steps: [`t = √(2h/g) = ${f(Math.sqrt(2 * hh / g), 3)} s`, `x = vₓt = ${f(vx * Math.sqrt(2 * hh / g), 3)} m`] }; } },
  { id: "k-up-from-h", topic: "kinematics", level: 3, related: "k-airtime", make: R => { const v = R.num(1, 4, 0.5), hh = R.num(1, 5, 0.5); const t = (v + Math.sqrt(v * v + 2 * g * hh)) / g; return {
    prompt: `From a ${hh} m high platform, a person jumps up at ${v} m/s. How long until they reach the ground below?`, givens: [["v₀", `${v} m/s up`], ["h", `${hh} m`]], answer: t, unit: "s",
    hint: "Up +: 0 = h + v₀t − ½gt². Take the positive root.", steps: [`−4.9t² + ${v}t + ${hh} = 0`, `t = ${f(t, 3)} s`] }; } },
  { id: "k-top", topic: "kinematics", level: 1, related: "b-top", make: () => ({ type: "mc", prompt: "At the highest point of a vertical jump, which is true?",
    choices: ["v = 0 and a = 0", "v = 0 and a = 9.8 m/s² downward", "v is maximum", "a points up"], answer: 1,
    hint: "Gravity never switches off.", steps: ["Velocity is zero for an instant; gravity still gives a = g downward."] }) },

  // ---------- drag ----------
  { id: "d-lin", topic: "drag", level: 2, related: "d-tau", make: R => { const m = R.num(0.5, 5, 0.5), b = R.num(0.5, 5, 0.5); return {
    prompt: `An object of mass ${m} kg falls with linear drag F = −bv, b = ${b} kg/s. Terminal speed?`, givens: [["m", `${m} kg`], ["b", `${b} kg/s`]], answer: m * g / b, unit: "m/s",
    hint: "At terminal speed b·v = m·g.", steps: [`v<sub>T</sub> = mg/b = ${f(m * g / b)} m/s`] }; } },
  { id: "d-quad", topic: "drag", level: 2, related: "d-lin", make: R => { const m = R.int(50, 90), A = R.num(0.3, 0.8, 0.1); return {
    prompt: `A ${m} kg skydiver (Cd = 1.0, A = ${A} m², ρ = 1.2 kg/m³) falls belly-down. Terminal speed?`, givens: [["m", `${m} kg`], ["A", `${A} m²`], ["Cd", "1.0"], ["ρ", "1.2 kg/m³"]], answer: Math.sqrt(2 * m * g / (1.2 * A)), unit: "m/s",
    hint: "½ρCdAv² = mg.", steps: [`v = √(2mg/ρCdA) = ${f(Math.sqrt(2 * m * g / (1.2 * A)), 1)} m/s`] }; } },
  { id: "d-tau", topic: "drag", level: 3, related: "d-half", make: R => { const m = R.num(1, 4, 0.5), b = R.num(0.5, 3, 0.5); return {
    prompt: `Linear drag, m = ${m} kg, b = ${b} kg/s, dropped from rest. Speed after one time constant τ = m/b?`, givens: [["m", `${m} kg`], ["b", `${b} kg/s`]], answer: (m * g / b) * (1 - Math.exp(-1)), unit: "m/s",
    hint: "v(t) = v<sub>T</sub>(1 − e<sup>−t/τ</sup>).", steps: [`v<sub>T</sub> = ${f(m * g / b)} m/s`, `v(τ) = v<sub>T</sub>(1 − e⁻¹) = 0.632·v<sub>T</sub> = ${f(m * g / b * 0.632)} m/s`] }; } },
  { id: "d-half", topic: "drag", level: 3, related: "d-tau", make: () => ({ type: "mc", prompt: "With LINEAR drag, what is the acceleration of a falling object when its speed is half its terminal speed?",
    choices: ["g", "g/2", "g/4", "zero"], answer: 1, hint: "a = g − (b/m)v and b·v<sub>T</sub> = mg.", steps: ["(b/m)(v<sub>T</sub>/2) = g/2", "a = g − g/2 = g/2"] }) },

  // ---------- energy ----------
  { id: "e-ke", topic: "energy", level: 1, related: "e-drop", make: R => { const m = R.int(40, 90), v = R.num(1, 6, 0.5); return {
    prompt: `Kinetic energy of a ${m} kg person moving at ${v} m/s?`, givens: [["m", `${m} kg`], ["v", `${v} m/s`]], answer: 0.5 * m * v * v, unit: "J",
    hint: "K = ½mv².", steps: [`K = ½ × ${m} × ${v}² = ${f(0.5 * m * v * v, 1)} J`], wrong: [{ v: m * v * v, why: "Missing the ½." }, { v: 0.5 * m * v, why: "Square the speed." }] }; } },
  { id: "e-drop", topic: "energy", level: 2, related: "e-loss", make: R => { const hh = R.num(0.5, 5, 0.5); return {
    prompt: `Using energy conservation, how fast is a person moving after falling ${hh} m from rest?`, givens: [["h", `${hh} m`]], answer: Math.sqrt(2 * g * hh), unit: "m/s",
    hint: "mgh = ½mv².", steps: [`v = √(2gh) = ${f(Math.sqrt(2 * g * hh))} m/s`] }; } },
  { id: "e-loss", topic: "energy", level: 2, related: "e-drop", make: R => { const m = R.int(50, 80), hh = R.int(10, 40), v = +(Math.sqrt(2 * g * hh) * R.num(0.7, 0.9, 0.05)).toFixed(1); return {
    prompt: `A ${m} kg diver falls ${hh} m from rest and hits the water at ${v} m/s. How much mechanical energy did air resistance take?`, givens: [["m", `${m} kg`], ["h", `${hh} m`], ["v", `${v} m/s`]], answer: m * g * hh - 0.5 * m * v * v, unit: "J",
    hint: "Energy lost = mgh − ½mv².", steps: [`mgh = ${f(m * g * hh, 0)} J`, `½mv² = ${f(0.5 * m * v * v, 0)} J`, `Lost = ${f(m * g * hh - 0.5 * m * v * v, 0)} J`] }; } },
  { id: "e-power", topic: "energy", level: 3, related: "e-ke", make: R => { const m = R.int(50, 80), hh = R.num(3, 8, 0.5), t = R.num(4, 12, 1); return {
    prompt: `A ${m} kg student runs up stairs ${hh} m high in ${t} s. Average power against gravity?`, givens: [["m", `${m} kg`], ["h", `${hh} m`], ["t", `${t} s`]], answer: m * g * hh / t, unit: "W",
    hint: "P = W/t = mgh/t.", steps: [`P = ${f(m * g * hh, 0)} J / ${t} s = ${f(m * g * hh / t, 0)} W`] }; } },
  { id: "e-slide", topic: "energy", level: 3, related: "fr-stop", make: R => { const v0 = R.num(3, 6, 0.5), mu = R.num(0.1, 0.3, 0.05), d = R.num(0.5, 2, 0.5); const v2 = v0 * v0 - 2 * mu * g * d; return v2 <= 0 ? null : {
    prompt: `A person slides at ${v0} m/s across a ${d} m rough patch (μk = ${mu}). Speed at the end of the patch?`, givens: [["v₀", `${v0} m/s`], ["μk", mu], ["d", `${d} m`]], answer: Math.sqrt(v2), unit: "m/s",
    hint: "Work–energy: ½mv² = ½mv₀² − μk·m·g·d.", steps: [`v = √(v₀² − 2μk·g·d) = ${f(Math.sqrt(v2))} m/s`] }; } },

  // ---------- momentum ----------
  { id: "m-p", topic: "momentum", level: 1, related: "m-stop", make: R => { const m = R.int(40, 90), v = R.num(1, 5, 0.5); return {
    prompt: `Size of the momentum of a ${m} kg person moving at ${v} m/s?`, givens: [["m", `${m} kg`], ["v", `${v} m/s`]], answer: m * v, unit: "kg·m/s",
    hint: "p = mv.", steps: [`p = ${m} × ${v} = ${f(m * v, 1)} kg·m/s`] }; } },
  { id: "m-stop", topic: "momentum", level: 2, related: "m-contact", make: R => { const m = R.int(40, 90), v = R.num(2, 6, 0.5), dt = R.num(0.05, 0.3, 0.01); return {
    prompt: `A ${m} kg person moving at ${v} m/s is stopped in ${dt} s. Size of the average NET force?`, givens: [["m", `${m} kg`], ["v", `${v} m/s`], ["Δt", `${dt} s`]], answer: m * v / dt, unit: "N",
    hint: "F<sub>net</sub>·Δt = Δp.", steps: [`Δp = ${f(m * v, 1)} kg·m/s`, `F = Δp/Δt = ${f(m * v / dt, 0)} N`] }; } },
  { id: "m-contact", topic: "momentum", level: 3, related: "m-stop", make: R => { const m = R.int(50, 80), hh = R.num(0.3, 1.5, 0.1), dt = R.num(0.05, 0.25, 0.01); const v = Math.sqrt(2 * g * hh); return {
    prompt: `A ${m} kg person drops ${hh} m and lands feet first, stopping in ${dt} s. Average force from the ground?`, givens: [["m", `${m} kg`], ["h", `${hh} m`], ["Δt", `${dt} s`]], answer: m * v / dt + m * g, unit: "N",
    hint: "Impact speed √(2gh). Then N − mg = Δp/Δt.", steps: [`v = ${f(v)} m/s`, `Δp/Δt = ${f(m * v / dt, 0)} N`, `N = ${f(m * v / dt, 0)} + ${f(m * g, 0)} = ${f(m * v / dt + m * g, 0)} N`],
    wrong: [{ v: m * v / dt, why: "That is the net force. The ground must also support the weight: add mg." }] }; } },
  { id: "m-push", topic: "momentum", level: 2, related: "m-catch", make: R => { const m1 = R.int(40, 60), m2 = R.int(60, 90), v1 = R.num(0.5, 2, 0.1); return {
    prompt: `Two skaters at rest push apart. The ${m1} kg skater moves off at ${v1} m/s. Speed of the ${m2} kg skater?`, givens: [["m₁", `${m1} kg`], ["v₁", `${v1} m/s`], ["m₂", `${m2} kg`]], answer: m1 * v1 / m2, unit: "m/s",
    hint: "Total momentum stays zero.", steps: [`m₁v₁ = m₂v₂ → v₂ = ${f(m1 * v1 / m2, 3)} m/s`] }; } },
  { id: "m-catch", topic: "momentum", level: 3, related: "m-push", make: R => { const mp = R.int(50, 80), mb = R.num(0.5, 5, 0.5), vb = R.int(5, 20); return {
    prompt: `A ${mp} kg person at rest on ice catches a ${mb} kg ball moving at ${vb} m/s. Their speed afterward?`, givens: [["m<sub>person</sub>", `${mp} kg`], ["m<sub>ball</sub>", `${mb} kg`], ["v", `${vb} m/s`]], answer: mb * vb / (mp + mb), unit: "m/s",
    hint: "Perfectly inelastic: they move together.", steps: [`v = m<sub>b</sub>v<sub>b</sub>/(m<sub>p</sub> + m<sub>b</sub>) = ${f(mb * vb / (mp + mb), 3)} m/s`] }; } },

  // ---------- multi-step ----------
  { id: "x-mu", topic: "multi", level: 4, related: "fr-stop", make: R => { const v = R.num(2, 4, 0.5), d = R.num(1, 4, 0.5); return {
    prompt: `A person sliding at ${v} m/s on flat feet stops in ${d} m. Find μk.`, givens: [["v₀", `${v} m/s`], ["d", `${d} m`]], answer: v * v / (2 * g * d), unit: "",
    hint: "Find a from kinematics, then a = μk·g.", steps: [`a = v²/2d = ${f(v * v / (2 * d))} m/s²`, `μk = a/g = ${f(v * v / (2 * g * d), 3)}`] }; } },
  { id: "x-tipslip", topic: "multi", level: 4, related: "fr-tip", make: R => { const m = R.int(55, 80), b = 0.26, hh = R.num(1.0, 1.4, 0.1), mu = R.pick([0.1, 0.15, 0.6, 0.9]); const Ft = m * g * b / 2 / hh, Fs = mu * m * g; return {
    prompt: `A ${m} kg person (rigid block, base ${b} m, μs = ${mu}) is pushed horizontally at ${hh} m height. What is the smallest push that makes them fall over or slide?`, givens: [["m", `${m} kg`], ["b", `${b} m`], ["h", `${hh} m`], ["μs", mu]], answer: Math.min(Ft, Fs), unit: "N",
    hint: "Compute both thresholds: tipping m·g·(b/2)/h and sliding μs·m·g. The smaller one happens first.", steps: [`Tip: ${f(Ft, 0)} N`, `Slide: ${f(Fs, 0)} N`, `Smaller: ${f(Math.min(Ft, Fs), 0)} N → ${Ft < Fs ? "tips" : "slides"}`] }; } },
  { id: "x-jump", topic: "multi", level: 4, related: "m-contact", make: R => { const m = R.int(55, 80), d = R.num(0.3, 0.5, 0.05), H = R.num(0.3, 0.6, 0.05); return {
    prompt: `A ${m} kg person crouches ${d} m and pushes off to jump ${H} m high (COM rise after takeoff). Average force from the floor during push-off?`, givens: [["m", `${m} kg`], ["push distance d", `${d} m`], ["jump height H", `${H} m`]], answer: m * g * (1 + H / d), unit: "N",
    hint: "Takeoff speed from H: v² = 2gH. Push-off: v² = 2ad. Then N = m(g + a).", steps: [`a = gH/d = ${f(g * H / d)} m/s²`, `N = m(g + a) = mg(1 + H/d) = ${f(m * g * (1 + H / d), 0)} N`] }; } },
  { id: "x-knees", topic: "multi", level: 4, related: "m-contact", make: R => { const m = R.int(55, 80), hh = R.num(0.5, 2, 0.1), s = R.num(0.1, 0.4, 0.05); return {
    prompt: `A ${m} kg person drops ${hh} m and bends their knees so the COM stops over ${s} m. Average force from the ground?`, givens: [["m", `${m} kg`], ["h", `${hh} m`], ["stop distance s", `${s} m`]], answer: m * g * (1 + hh / s), unit: "N",
    hint: "Work–energy for the whole motion: mg(h + s) = N·s.", steps: ["mg(h + s) − N·s = 0", `N = mg(1 + h/s) = ${f(m * g * (1 + hh / s), 0)} N`] }; } },

  // ---------- written (self-checked) ----------
  { id: "w-ice", topic: "friction", level: 3, related: "x-tipslip", make: () => ({ type: "free", prompt: "Explain why the same shove tends to make a person on ice slide but makes a person on a rubber floor tip over.",
    model: "Sliding happens when the push exceeds μs·m·g; tipping happens when the push's torque about the front edge, F·h, exceeds m·g·(b/2). On ice μs is tiny, so the sliding threshold is reached first. On rubber μs is large, so the friction holds the feet and the smaller tipping threshold is reached first: the body rotates over the toes." }) },
  { id: "w-pair", topic: "newton", level: 3, related: "n-third", make: () => ({ type: "free", prompt: "Explain why the normal force and the weight on a standing person are not a Newton's third law pair, even though they are equal and opposite.",
    model: "A third-law pair acts on two different objects and comes from one interaction. N (floor on person) and Fg (Earth on person) both act on the person and come from different interactions (contact vs gravity). They are equal only because a = 0; in an accelerating elevator they differ. The partner of N is the person's push on the floor; the partner of Fg is the person's pull on Earth." }) },
  { id: "w-step", topic: "torque", level: 4, related: "t-hold", make: () => ({ type: "free", prompt: "Using torque and the base of support, explain how taking a step forward stops a forward fall.",
    model: "When the COM passes over the toes, gravity's torque about the toes points forward and the body accelerates into a rotation. Stepping forward places a new foot ahead of the COM projection, which moves the base of support (and the pivot) in front of the COM. Gravity's torque about the new contact now points backward, and the ground's force can slow and stop the rotation." }) }
];
