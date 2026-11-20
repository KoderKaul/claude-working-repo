/**
 * PaiNo remedy library.
 *
 * Common, gentle self-care moves and habits for everyday muscle & joint aches, the kind a
 * physiotherapist typically starts with. General information only — not a diagnosis or a
 * personal treatment plan.
 *
 * `targets` are fragments of Z-Anatomy structure names (case-insensitive) that are lit up on
 * the 3D body. A unit test checks that every fragment matches a real structure.
 *
 * Region ids (src/data/regions.json): 1 head, 2 jaw, 3 neck, 4 shoulder, 5 chest, 6 upper back,
 * 7 mid back, 8 lower back, 9 abdomen, 10 hip & groin, 11 buttock, 12 upper arm, 13 elbow,
 * 14 forearm, 15 wrist & hand, 16 thigh, 17 knee, 18 lower leg, 19 ankle & foot.
 */

export type RemedyKind = 'stretch' | 'strengthen' | 'mobility' | 'habit' | 'relief';

export interface Remedy {
  id: string;
  title: string;
  kind: RemedyKind;
  /** Body regions it is meant for; the first is the main one. */
  regions: number[];
  /** One line, plain words: what it does and why it may help. */
  why: string;
  steps: string[];
  /** How much / how often. */
  dose: string;
  caution?: string;
  /** Muscles to light up on the 3D body. */
  targets?: string[];
  /** Which way to turn the body to see the targets. */
  view?: 'front' | 'back' | 'left' | 'right';
  /** Activities (from the log form) that make this especially relevant. */
  activities?: string[];
  /** Pain feelings this suits best. */
  painTypes?: string[];
}

export const KIND_LABEL: Record<RemedyKind, string> = {
  stretch: 'Stretch',
  strengthen: 'Strengthen',
  mobility: 'Loosen up',
  habit: 'Habit',
  relief: 'Quick relief',
};

const DESK = ['Sitting / desk work', 'Phone / laptop use', 'Driving'];
const RUN = ['Running', 'Walking', 'Sport', 'Stairs'];
const LIFT = ['Lifting / carrying', 'Bending', 'Housework', 'Workout / gym'];
const MORNING = ['Just woke up', 'Sleeping'];

export const REMEDIES: Remedy[] = [
  // ------------------------------------------------------------------ neck & head
  {
    id: 'chin-tuck', title: 'Chin tucks', kind: 'strengthen', regions: [3, 1, 6],
    why: 'Wakes up the small deep muscles at the front of the neck that hold your head up, so the back of the neck works less.',
    steps: [
      'Sit or stand tall, looking straight ahead.',
      'Gently slide your chin straight back, as if making a double chin. Keep your eyes level — don’t nod.',
      'Hold for 5 seconds, then relax.',
    ],
    dose: '10 times, 2–3 times a day', targets: ['Longus colli', 'Longus capitis'], view: 'front',
    activities: DESK, painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'upper-trap-stretch', title: 'Side-of-neck stretch', kind: 'stretch', regions: [3, 1, 4],
    why: 'Lengthens the muscles between the neck and shoulder that tighten when you hunch or feel stressed.',
    steps: [
      'Sit tall and hold the edge of your chair with your right hand.',
      'Tilt your left ear towards your left shoulder until you feel a gentle stretch on the right side.',
      'Breathe slowly. Swap sides.',
    ],
    dose: 'Hold 30 seconds, 2 times each side, a few times a day', targets: ['Descending part of trapezius', 'Levator scapulae', 'Scalenus'], view: 'back',
    activities: DESK, painTypes: ['Stiffness', 'Dull ache', 'Throbbing'],
  },
  {
    id: 'levator-stretch', title: 'Shoulder-blade-to-neck stretch', kind: 'stretch', regions: [3, 6],
    why: 'Targets the muscle that lifts the shoulder blade, a common spot for a knot at the base of the neck.',
    steps: [
      'Sit tall. Turn your head 45° to the left and look down towards your left pocket.',
      'Place your left hand on the back of your head and let its weight add a light stretch.',
      'You should feel it at the back-right of the neck. Swap sides.',
    ],
    dose: 'Hold 30 seconds, 2 times each side', targets: ['Levator scapulae'], view: 'back',
    activities: DESK, painTypes: ['Stiffness', 'Tender to touch'],
  },
  {
    id: 'screen-height', title: 'Raise your screen to eye level', kind: 'habit', regions: [3, 6, 1],
    why: 'Looking down at a screen makes your neck hold the weight of your head at an angle for hours.',
    steps: [
      'Top of the monitor at or slightly below eye level, about an arm’s length away.',
      'Laptop: raise it on a stand or books and use a separate keyboard and mouse.',
      'Phone: bring it up towards eye level instead of dropping your head.',
    ],
    dose: 'Set up once; check whenever you change where you work', targets: ['Splenius capitis', 'Semispinalis'], view: 'back',
    activities: DESK,
  },
  {
    id: 'movement-breaks', title: 'Move every 30–45 minutes', kind: 'habit', regions: [8, 3, 6, 7, 11, 1],
    why: 'Muscles and discs like changing position. Short, frequent breaks beat one long stretch at the end of the day.',
    steps: [
      'Set a repeating timer for 30–45 minutes.',
      'When it goes off: stand up, walk to get water, roll your shoulders, look into the distance.',
      'Even 1–2 minutes counts.',
    ],
    dose: 'Every 30–45 minutes while sitting', activities: DESK, painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'warmth-neck', title: 'Warmth on the neck and shoulders', kind: 'relief', regions: [3, 1, 6, 2],
    why: 'Warmth relaxes tight muscles and often eases tension-type headaches.',
    steps: [
      'Use a warm (not hot) pack, hot-water bottle wrapped in a towel, or a warm shower.',
      'Rest it across the back of the neck and tops of the shoulders.',
    ],
    dose: '15–20 minutes, up to 3 times a day', caution: 'Not on numb skin or a fresh injury that is swollen.',
    painTypes: ['Stiffness', 'Dull ache', 'Throbbing'],
  },
  {
    id: 'box-breathing', title: 'Slow breathing break', kind: 'relief', regions: [1, 3, 2, 6],
    why: 'Stress tightens the jaw, neck and shoulders. A few slow breaths switch the body out of “tense” mode.',
    steps: [
      'Breathe in through your nose for 4 seconds.',
      'Hold for 4, breathe out slowly for 6, hold for 2.',
      'Let your shoulders drop and jaw soften on each out-breath.',
    ],
    dose: '2–5 minutes, any time you notice tension', painTypes: ['Throbbing', 'Dull ache'],
  },
  {
    id: '20-20-20', title: 'Rest your eyes: 20-20-20', kind: 'habit', regions: [1],
    why: 'Long screen focus strains the eyes and can trigger headaches.',
    steps: ['Every 20 minutes, look at something about 20 feet (6 m) away for 20 seconds.', 'Blink fully a few times.'],
    dose: 'Every 20 minutes of screen time', activities: DESK,
  },
  {
    id: 'hydrate', title: 'Drink water and keep regular meals', kind: 'habit', regions: [1],
    why: 'Dehydration and skipped meals are common, easy-to-fix headache triggers.',
    steps: ['Keep a water bottle within reach and sip through the day.', 'Try not to go more than 4–5 hours without eating.'],
    dose: 'Daily',
  },

  // ------------------------------------------------------------------ jaw
  {
    id: 'jaw-rest', title: 'Jaw rest position', kind: 'habit', regions: [2, 1],
    why: 'Many people clench without noticing. Resting the jaw correctly takes load off the chewing muscles and jaw joint.',
    steps: [
      'Lips together, teeth slightly apart, tongue resting on the roof of your mouth just behind the front teeth.',
      'Check in on this whenever you notice tension, e.g. at every phone notification.',
    ],
    dose: 'Check many times a day', targets: ['masseter', 'Temporalis muscle'], view: 'left',
    painTypes: ['Dull ache', 'Tender to touch'],
  },
  {
    id: 'jaw-massage', title: 'Gentle jaw muscle massage', kind: 'relief', regions: [2, 1],
    why: 'Loosens the big chewing muscle (masseter) on the side of the face.',
    steps: [
      'Find the muscle by clenching lightly — it bulges in front of the ear, above the jaw angle. Then relax.',
      'With two fingers, make slow small circles over it.',
      'Use light to medium pressure only.',
    ],
    dose: '1–2 minutes each side, 2–3 times a day', targets: ['masseter'], view: 'left',
  },
  {
    id: 'soft-food', title: 'Give the jaw a break', kind: 'habit', regions: [2],
    why: 'Resting a sore jaw for a few days helps it settle.',
    steps: ['Avoid chewing gum, very chewy or hard foods for a few days.', 'Cut food into small pieces; avoid very wide yawns.'],
    dose: 'During a flare-up',
  },

  // ------------------------------------------------------------------ shoulder
  {
    id: 'pendulum', title: 'Shoulder pendulum', kind: 'mobility', regions: [4],
    why: 'Lets gravity gently move a stiff or sore shoulder without the muscles having to work.',
    steps: [
      'Lean forward with your good hand on a table. Let the sore arm hang down loosely.',
      'Gently sway your body so the arm swings in small circles, then forwards-backwards.',
      'Keep the arm relaxed — the movement comes from your body.',
    ],
    dose: '30–60 seconds, 2–3 times a day', targets: ['deltoid muscle', 'Supraspinatus'], view: 'right',
    painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'cross-body', title: 'Cross-body shoulder stretch', kind: 'stretch', regions: [4, 6],
    why: 'Stretches the back of the shoulder, which often gets tight and pulls the joint out of line.',
    steps: [
      'Bring one arm across your chest at shoulder height.',
      'With the other hand, gently hug it closer at the elbow (not the joint itself).',
      'Feel the stretch at the back of the shoulder. Swap sides.',
    ],
    dose: 'Hold 30 seconds, 2–3 times each side', targets: ['Scapular spinal part of deltoid', 'Infraspinatus', 'Teres minor'], view: 'back',
    painTypes: ['Stiffness'],
  },
  {
    id: 'external-rotation', title: 'Rotator cuff turn-outs', kind: 'strengthen', regions: [4],
    why: 'Strengthens the rotator cuff — small muscles that keep the ball of the shoulder centred.',
    steps: [
      'Stand with your elbow bent at 90°, tucked against your side (a rolled towel there helps).',
      'Holding a light resistance band anchored at belly height, rotate your forearm outwards, keeping the elbow at your side.',
      'Return slowly.',
    ],
    dose: '2–3 sets of 10–15, every other day', caution: 'Use a light band. Some effort is fine; sharp pain is not.',
    targets: ['Infraspinatus', 'Teres minor'], view: 'back', activities: LIFT,
  },
  {
    id: 'wall-slide', title: 'Wall slides', kind: 'mobility', regions: [4, 6],
    why: 'Trains the shoulder blades to move well when you lift your arms.',
    steps: [
      'Stand facing a wall, forearms resting on it at shoulder height.',
      'Slide your forearms up the wall as far as is comfortable, letting your shoulder blades rotate up.',
      'Slide back down slowly.',
    ],
    dose: '10 slow slides, once or twice a day', targets: ['Serratus anterior', 'Ascending part of trapezius'], view: 'left',
  },
  {
    id: 'sleep-shoulder', title: 'Sleep position for a sore shoulder', kind: 'habit', regions: [4],
    why: 'Lying on the sore shoulder squeezes it all night.',
    steps: ['Sleep on your back or the other side.', 'Hug a pillow to support the sore arm in front of you.'],
    dose: 'Nightly during a flare-up', activities: MORNING,
  },

  // ------------------------------------------------------------------ chest & upper / mid back
  {
    id: 'doorway-pec', title: 'Doorway chest stretch', kind: 'stretch', regions: [5, 6, 4, 7],
    why: 'Opens up tight chest muscles that round the shoulders forward after lots of sitting.',
    steps: [
      'Stand in a doorway with forearms on the frame, elbows at shoulder height.',
      'Step one foot forward and gently lean through until you feel a stretch across the chest.',
      'Keep your back straight and breathe.',
    ],
    dose: 'Hold 30 seconds, 3 times, once or twice a day', targets: ['pectoralis major', 'Pectoralis minor'], view: 'front',
    activities: DESK, painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'shoulder-squeeze', title: 'Shoulder blade squeezes', kind: 'strengthen', regions: [6, 7, 3],
    why: 'Strengthens the muscles between the shoulder blades that hold you upright.',
    steps: [
      'Sit or stand tall with arms relaxed.',
      'Squeeze your shoulder blades back and slightly down, as if pinching a pencil between them.',
      'Hold 5 seconds and relax. Don’t shrug.',
    ],
    dose: '10–15 times, 2–3 times a day', targets: ['Rhomboid major', 'Rhomboid minor', 'Transverse part of trapezius'], view: 'back',
    activities: DESK, painTypes: ['Dull ache', 'Stiffness'],
  },
  {
    id: 'band-row', title: 'Band rows', kind: 'strengthen', regions: [6, 7, 4],
    why: 'Builds endurance in the upper-back muscles so they tire less during the day.',
    steps: [
      'Loop a resistance band around something sturdy at chest height.',
      'Holding the ends, pull your elbows back past your body, squeezing the shoulder blades together.',
      'Return slowly.',
    ],
    dose: '2–3 sets of 12, every other day', targets: ['Rhomboid major', 'Transverse part of trapezius', 'Latissimus dorsi'], view: 'back',
    activities: DESK,
  },
  {
    id: 'thoracic-extension', title: 'Chair back-bend', kind: 'mobility', regions: [7, 6],
    why: 'Loosens the upper and mid back, which gets stuck in a rounded position when sitting.',
    steps: [
      'Sit in a chair with a backrest that comes up to your shoulder blades.',
      'Hands behind your head, elbows forward.',
      'Gently lean back over the top of the backrest, then return. Move to a slightly different spot and repeat.',
    ],
    dose: '5–10 times, a few times a day', targets: ['Longissimus thoracis', 'Spinalis thoracis', 'Iliocostalis thoracis'], view: 'back',
    activities: DESK, painTypes: ['Stiffness'],
  },
  {
    id: 'thread-needle', title: 'Thread the needle', kind: 'mobility', regions: [7, 6, 4],
    why: 'Gently twists the mid back, which helps when it feels stiff or achy between the shoulder blades.',
    steps: [
      'Start on hands and knees.',
      'Slide your right arm under your body towards the left, letting your shoulder and head drop.',
      'Come back up and reach the right arm up to the ceiling. Swap sides.',
    ],
    dose: '8–10 times each side', targets: ['Rhomboid major', 'Multifidus thoracis', 'External abdominal oblique'], view: 'back',
    painTypes: ['Stiffness'],
  },
  {
    id: 'cat-cow', title: 'Cat–cow', kind: 'mobility', regions: [8, 7, 6],
    why: 'Moves the whole spine gently through bending and arching; great for morning stiffness.',
    steps: [
      'On hands and knees, hands under shoulders, knees under hips.',
      'Breathe in: let your belly drop and look up slightly (cow).',
      'Breathe out: round your back up towards the ceiling and tuck your chin (cat).',
    ],
    dose: '10 slow rounds, morning and evening', targets: ['Multifidus lumborum', 'Longissimus thoracis', 'Rectus abdominis'], view: 'back',
    activities: MORNING, painTypes: ['Stiffness', 'Dull ache'],
  },

  // ------------------------------------------------------------------ lower back
  {
    id: 'knee-to-chest', title: 'Knee-to-chest', kind: 'stretch', regions: [8, 11],
    why: 'Gently stretches the lower back muscles and takes pressure off the joints of the spine.',
    steps: [
      'Lie on your back with knees bent.',
      'Bring one knee up and hold it with both hands below the kneecap. Pull it gently towards your chest.',
      'Hold, lower it, and swap. Then try both knees together.',
    ],
    dose: 'Hold 20–30 seconds, 3 times each', targets: ['Multifidus lumborum', 'Iliocostalis lumborum', 'Gluteus maximus'], view: 'back',
    activities: [...MORNING, ...DESK], painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'childs-pose', title: 'Child’s pose', kind: 'stretch', regions: [8, 7, 6],
    why: 'A relaxing stretch for the whole back and the large side-back muscles.',
    steps: [
      'Kneel, then sit back towards your heels.',
      'Walk your hands forward and let your chest sink towards the floor.',
      'Breathe slowly into your back. Walk the hands to one side, then the other, for the sides of the back.',
    ],
    dose: 'Hold 30–60 seconds, 2–3 times', targets: ['Latissimus dorsi', 'Multifidus lumborum', 'Quadratus lumborum'], view: 'back',
    painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'pelvic-tilt', title: 'Pelvic tilts', kind: 'mobility', regions: [8, 9],
    why: 'A very gentle movement that teaches the deep core and lower back to work together.',
    steps: [
      'Lie on your back, knees bent, feet flat.',
      'Gently flatten your lower back into the floor by tightening your belly, tipping your pelvis up.',
      'Hold 5 seconds, then relax and let a small arch return.',
    ],
    dose: '10–15 times, twice a day', targets: ['Transversus abdominis', 'Rectus abdominis', 'Multifidus lumborum'], view: 'front',
    painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'bird-dog', title: 'Bird-dog', kind: 'strengthen', regions: [8, 11, 7],
    why: 'Builds back and hip endurance while keeping the spine still — one of the most-used back exercises.',
    steps: [
      'On hands and knees, back flat.',
      'Slowly reach your right arm forward and left leg back until both are level with your body.',
      'Hold 5 seconds without letting your back twist or sag. Swap sides.',
    ],
    dose: '8–10 each side, once a day', caution: 'Keep the movement small at first if it pulls on your back.',
    targets: ['Multifidus lumborum', 'Gluteus maximus', 'Longissimus thoracis'], view: 'back', activities: LIFT,
  },
  {
    id: 'glute-bridge', title: 'Glute bridge', kind: 'strengthen', regions: [11, 8, 17, 16],
    why: 'Strong buttock muscles share the work of standing, lifting and running with your back and knees.',
    steps: [
      'Lie on your back, knees bent, feet hip-width apart.',
      'Squeeze your buttocks and lift your hips until knees, hips and shoulders form a line.',
      'Hold 3 seconds, lower slowly.',
    ],
    dose: '2–3 sets of 10–12, every other day', targets: ['Gluteus maximus', 'Semitendinosus', 'Long head of biceps femoris'], view: 'back',
    activities: [...DESK, ...RUN],
  },
  {
    id: 'hip-flexor', title: 'Kneeling hip-front stretch', kind: 'stretch', regions: [10, 8, 16],
    why: 'Sitting keeps the hip-front muscles short. When tight, they tug on the lower back.',
    steps: [
      'Kneel on your right knee (cushion under it), left foot flat in front.',
      'Tuck your tailbone under and gently shift your hips forward until you feel a stretch at the front of the right hip.',
      'Don’t arch your back. Swap sides.',
    ],
    dose: 'Hold 30 seconds, 2–3 times each side, daily', targets: ['Psoas major', 'Iliacus muscle', 'Rectus femoris'], view: 'front',
    activities: [...DESK, ...RUN], painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'lifting', title: 'Lift with your hips, not your back', kind: 'habit', regions: [8, 11],
    why: 'Bending and twisting with a load is a common trigger for back flare-ups.',
    steps: [
      'Stand close to the object, feet apart.',
      'Bend at hips and knees, keep your back long, brace your belly.',
      'Hold the load close to your body; turn with your feet instead of twisting.',
    ],
    dose: 'Every time you lift', activities: LIFT, painTypes: ['Sharp'],
  },
  {
    id: 'walk', title: 'Short easy walks', kind: 'habit', regions: [8, 11, 10, 7],
    why: 'Gentle walking is one of the best-supported ways to help everyday back pain settle. Bed rest usually slows recovery.',
    steps: ['Walk at an easy, comfortable pace on flat ground.', 'Start with what feels OK — even 5 minutes — and add a little each day.'],
    dose: '10–20 minutes, 1–3 times a day', activities: DESK, painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'heat-back', title: 'Heat on the lower back', kind: 'relief', regions: [8, 11, 7],
    why: 'Warmth relaxes muscle spasm and makes moving easier.',
    steps: ['Use a heat pack or hot-water bottle wrapped in a towel over the sore area.', 'Follow it with a gentle stretch while the muscles are warm.'],
    dose: '15–20 minutes, up to 3 times a day', caution: 'Not on numb skin; don’t fall asleep on a heat pad.',
    painTypes: ['Stiffness', 'Dull ache', 'Cramping'],
  },

  // ------------------------------------------------------------------ hip & buttock
  {
    id: 'figure-four', title: 'Figure-4 buttock stretch', kind: 'stretch', regions: [11, 8, 10],
    why: 'Stretches deep buttock muscles (including the piriformis), which can refer ache into the lower back and down the leg.',
    steps: [
      'Lie on your back, knees bent.',
      'Cross your right ankle over your left knee.',
      'Hold behind the left thigh and gently pull it towards you until you feel a stretch in the right buttock. Swap.',
    ],
    dose: 'Hold 30 seconds, 2–3 times each side', targets: ['Piriformis muscle', 'Gluteus maximus', 'Gluteus medius'], view: 'back',
    activities: [...DESK, ...RUN], painTypes: ['Dull ache', 'Stiffness'],
  },
  {
    id: 'clamshell', title: 'Clamshells', kind: 'strengthen', regions: [10, 11, 17],
    why: 'Strengthens the side-hip muscles that keep your pelvis level and knees in line when you walk and run.',
    steps: [
      'Lie on your side, hips and knees bent, feet together.',
      'Keeping your feet touching, lift the top knee like a clam opening. Don’t let your hips roll back.',
      'Lower slowly.',
    ],
    dose: '2–3 sets of 12–15 each side, every other day', targets: ['Gluteus medius', 'Gluteus minimus'], view: 'left',
    activities: RUN,
  },
  {
    id: 'butterfly', title: 'Butterfly groin stretch', kind: 'stretch', regions: [10, 16],
    why: 'Eases tight inner-thigh muscles, a common source of groin ache in active people.',
    steps: [
      'Sit with the soles of your feet together and knees falling out to the sides.',
      'Hold your ankles, sit tall, and let your knees drop gently. Lean forward a little for more.',
    ],
    dose: 'Hold 30 seconds, 3 times', targets: ['Adductor longus', 'Adductor brevis', 'Adductor magnus', 'Gracilis', 'Pectineus'], view: 'front',
    activities: ['Sport', 'Running'], painTypes: ['Stiffness'],
  },

  // ------------------------------------------------------------------ thigh & knee
  {
    id: 'hamstring', title: 'Hamstring stretch', kind: 'stretch', regions: [16, 17, 8],
    why: 'Tight back-of-thigh muscles pull on the pelvis and the back of the knee.',
    steps: [
      'Lie on your back. Loop a towel or strap around one foot.',
      'Keeping the knee nearly straight, raise the leg until you feel a stretch behind the thigh.',
      'Keep the other leg relaxed on the floor. Swap.',
    ],
    dose: 'Hold 30 seconds, 2–3 times each side', targets: ['Semitendinosus', 'Semimembranosus', 'biceps femoris'], view: 'back',
    activities: [...RUN, ...DESK], painTypes: ['Stiffness'],
  },
  {
    id: 'quad-stretch', title: 'Front-of-thigh stretch', kind: 'stretch', regions: [16, 17, 10],
    why: 'Loosens the thigh muscles that pull on the kneecap.',
    steps: [
      'Stand holding a wall for balance.',
      'Bend one knee and hold the ankle behind you, knees together.',
      'Tuck your tailbone under until you feel the stretch at the front of the thigh. Swap.',
    ],
    dose: 'Hold 30 seconds, 2 times each side', targets: ['Rectus femoris', 'Vastus lateralis', 'Vastus medialis', 'Vastus intermedius'], view: 'front',
    activities: RUN, painTypes: ['Stiffness', 'Dull ache'],
  },
  {
    id: 'straight-leg-raise', title: 'Straight-leg raises', kind: 'strengthen', regions: [17, 16],
    why: 'Strengthens the thigh without bending the knee — a safe start for a sore knee.',
    steps: [
      'Lie on your back, one knee bent, the other leg straight.',
      'Tighten the thigh of the straight leg, then lift it to the height of the other knee.',
      'Hold 3 seconds and lower slowly.',
    ],
    dose: '2–3 sets of 10 each leg, daily', targets: ['Rectus femoris', 'Vastus medialis', 'Vastus lateralis'], view: 'front',
    activities: [...RUN, 'Stairs'],
  },
  {
    id: 'wall-sit', title: 'Mini wall squats', kind: 'strengthen', regions: [17, 16, 11],
    why: 'Builds the thigh muscles that absorb load on stairs and when running.',
    steps: [
      'Stand with your back against a wall, feet a step forward and hip-width apart.',
      'Slide down a little (a quarter squat) — only as far as is comfortable for the knee.',
      'Hold, then slide back up.',
    ],
    dose: 'Hold 10–30 seconds, 5 times, every other day', caution: 'Keep knees over your toes; stay shallow if it hurts.',
    targets: ['Vastus medialis', 'Vastus lateralis', 'Rectus femoris', 'Gluteus maximus'], view: 'front', activities: [...RUN, 'Stairs'],
  },
  {
    id: 'it-band-roll', title: 'Foam-roll the outer thigh', kind: 'relief', regions: [16, 17, 10],
    why: 'Eases tightness in the outer-thigh muscles that attach to the IT band near the knee.',
    steps: [
      'Lie on your side with a foam roller under the outer thigh, between hip and knee.',
      'Support yourself with your hands and top foot, and roll slowly. Pause on tender spots and breathe.',
    ],
    dose: '1–2 minutes each side', caution: 'It should feel like a strong massage, not sharp pain. Don’t roll over the knee joint.',
    targets: ['Iliotibial tract', 'Tensor fasciae latae', 'Vastus lateralis'], view: 'left', activities: RUN,
  },
  {
    id: 'running-load', title: 'Build running slowly', kind: 'habit', regions: [17, 18, 19, 16, 10],
    why: 'Most running aches come from doing too much too soon, not from running itself.',
    steps: [
      'Increase weekly distance by no more than about 10%.',
      'Leave a rest or easy day after hard runs or hills.',
      'Change worn-out shoes (often after ~500–800 km).',
    ],
    dose: 'Ongoing', activities: RUN,
  },
  {
    id: 'ice-flare', title: 'Cold pack after activity', kind: 'relief', regions: [17, 19, 13, 15, 18],
    why: 'Cold can calm a joint or tendon that flares up after activity.',
    steps: ['Wrap ice or a bag of frozen peas in a thin towel.', 'Rest it on the sore spot with the limb raised.'],
    dose: '10–15 minutes, after activity or a few times a day', caution: 'Never put ice straight on skin.',
    activities: RUN, painTypes: ['Throbbing', 'Sharp', 'Swelling'],
  },

  // ------------------------------------------------------------------ lower leg, ankle & foot
  {
    id: 'calf-stretch', title: 'Wall calf stretch', kind: 'stretch', regions: [18, 19, 17],
    why: 'Tight calves pull on the Achilles tendon and the sole of the foot.',
    steps: [
      'Face a wall, hands on it. Step one foot back, heel down, back knee straight.',
      'Lean forward until you feel the stretch in the upper calf. Hold.',
      'Then bend the back knee slightly to stretch the lower calf. Swap.',
    ],
    dose: 'Hold 30 seconds each way, 2–3 times each side', targets: ['gastrocnemius', 'Soleus', 'Calcaneal tendon'], view: 'back',
    activities: [...RUN, ...MORNING], painTypes: ['Stiffness', 'Cramping'],
  },
  {
    id: 'calf-raise', title: 'Calf raises', kind: 'strengthen', regions: [18, 19],
    why: 'Stronger calves and Achilles tendons cope better with walking, running and stairs.',
    steps: [
      'Stand holding a wall or chair, feet hip-width apart.',
      'Rise up onto your toes, then lower slowly (count 3 on the way down).',
      'When easy, do it on one leg.',
    ],
    dose: '2–3 sets of 15, every other day', targets: ['gastrocnemius', 'Soleus'], view: 'back', activities: RUN,
  },
  {
    id: 'toe-raise', title: 'Toe raises (for shins)', kind: 'strengthen', regions: [18],
    why: 'Strengthens the muscle at the front of the shin, often sore when you start running more.',
    steps: [
      'Stand with your back against a wall, heels about a foot from it.',
      'Lift your toes and front of the feet up towards the shins, then lower slowly.',
    ],
    dose: '2–3 sets of 15, every other day', targets: ['Tibialis anterior'], view: 'front', activities: RUN,
  },
  {
    id: 'plantar-stretch', title: 'Sole-of-foot stretch', kind: 'stretch', regions: [19],
    why: 'Stretches the thick band under the foot (plantar fascia). Very helpful for heel pain on the first steps in the morning.',
    steps: [
      'Sit and cross one foot over the other knee.',
      'Pull your toes back towards the shin with one hand until you feel a stretch along the sole.',
      'Do this before getting out of bed if mornings are worst.',
    ],
    dose: 'Hold 10–30 seconds, 10 times, 3 times a day', targets: ['Plantar aponeurosis', 'Flexor digitorum brevis', 'Abductor hallucis'], view: 'back',
    activities: [...MORNING, ...RUN, 'Standing'], painTypes: ['Sharp', 'Stiffness'],
  },
  {
    id: 'ball-roll', title: 'Roll the sole on a ball', kind: 'relief', regions: [19],
    why: 'Massages the sole of the foot and eases tightness.',
    steps: ['Sit and roll a tennis ball (or a frozen water bottle for cooling) under your foot, heel to toes.', 'Use steady, comfortable pressure.'],
    dose: '1–2 minutes per foot, a few times a day', targets: ['Plantar aponeurosis', 'Flexor digitorum brevis'], view: 'back',
    activities: ['Standing', 'Walking'],
  },
  {
    id: 'ankle-alphabet', title: 'Ankle alphabet', kind: 'mobility', regions: [19, 18],
    why: 'Gently moves the ankle in every direction to ease stiffness after a sprain or long sitting.',
    steps: ['Sit with your leg out and foot in the air.', 'Using your big toe as a pen, draw the letters A to Z slowly.'],
    dose: 'Once or twice a day', targets: ['Tibialis anterior', 'Fibularis longus', 'gastrocnemius'], view: 'right',
    painTypes: ['Stiffness'],
  },
  {
    id: 'balance', title: 'Single-leg balance', kind: 'strengthen', regions: [19, 18, 17],
    why: 'Trains the small ankle muscles and reflexes that protect against rolling the ankle.',
    steps: ['Stand on one leg near a wall or counter for safety.', 'When easy for 30 seconds, try with eyes closed or on a cushion.'],
    dose: '30 seconds, 3 times each leg, daily', targets: ['Fibularis longus', 'Fibularis brevis', 'Tibialis posterior'], view: 'left',
    activities: RUN,
  },
  {
    id: 'footwear', title: 'Supportive footwear', kind: 'habit', regions: [19, 18, 17],
    why: 'Flat, worn-out or unsupportive shoes and long hours barefoot on hard floors overload the feet.',
    steps: ['Wear cushioned, supportive shoes, especially if standing a lot.', 'Avoid walking barefoot on hard floors while sore.'],
    dose: 'Daily', activities: ['Standing', 'Walking', 'Running'],
  },

  // ------------------------------------------------------------------ arm, elbow, wrist & hand
  {
    id: 'triceps-stretch', title: 'Overhead triceps stretch', kind: 'stretch', regions: [12, 4],
    why: 'Stretches the back of the upper arm.',
    steps: ['Raise one arm and bend the elbow so the hand drops behind your head.', 'With the other hand, gently press the elbow back. Swap.'],
    dose: 'Hold 30 seconds, 2 times each side', targets: ['triceps brachii'], view: 'back',
    activities: ['Workout / gym'], painTypes: ['Stiffness'],
  },
  {
    id: 'biceps-stretch', title: 'Wall biceps stretch', kind: 'stretch', regions: [12, 13, 5],
    why: 'Stretches the front of the upper arm and chest.',
    steps: [
      'Stand side-on to a wall. Place your palm on the wall behind you at shoulder height, thumb up.',
      'Slowly turn your body away until you feel a stretch along the front of the arm. Swap.',
    ],
    dose: 'Hold 30 seconds, 2 times each side', targets: ['biceps brachii', 'Brachialis'], view: 'front',
    activities: LIFT,
  },
  {
    id: 'wrist-extensor', title: 'Back-of-forearm stretch', kind: 'stretch', regions: [13, 14, 15],
    why: 'Eases the forearm muscles behind “tennis elbow”-type pain on the outside of the elbow.',
    steps: [
      'Hold your arm out straight, palm down.',
      'With the other hand, gently bend the wrist down until you feel a stretch on the top of the forearm.',
    ],
    dose: 'Hold 30 seconds, 3 times, a few times a day', targets: ['Extensor carpi radialis brevis', 'Extensor carpi radialis longus', 'Extensor digitorum.'], view: 'back',
    activities: ['Phone / laptop use', 'Lifting / carrying', 'Sport'], painTypes: ['Dull ache', 'Tender to touch'],
  },
  {
    id: 'wrist-flexor', title: 'Front-of-forearm stretch', kind: 'stretch', regions: [13, 14, 15],
    why: 'Eases the forearm muscles behind “golfer’s elbow”-type pain on the inside of the elbow and tired wrists.',
    steps: [
      'Hold your arm out straight, palm up.',
      'With the other hand, gently pull the fingers back towards you.',
    ],
    dose: 'Hold 30 seconds, 3 times, a few times a day', targets: ['Flexor carpi radialis', 'flexor carpi ulnaris', 'Palmaris longus', 'Flexor digitorum superficialis'], view: 'front',
    activities: ['Phone / laptop use', 'Lifting / carrying', 'Workout / gym'], painTypes: ['Dull ache', 'Tender to touch'],
  },
  {
    id: 'eccentric-wrist', title: 'Slow wrist lowers', kind: 'strengthen', regions: [13, 14],
    why: 'Slow, controlled lowering is a well-used way to help forearm tendons at the elbow get stronger.',
    steps: [
      'Rest your forearm on a table, hand over the edge, palm down, holding a light weight (a water bottle).',
      'Use the other hand to help lift the wrist up.',
      'Then lower it slowly on its own over 3–4 seconds.',
    ],
    dose: '3 sets of 15, once a day for several weeks', caution: 'Mild discomfort is OK; stop if pain is sharp or lasts into the next day.',
    targets: ['Extensor carpi radialis brevis', 'Extensor carpi radialis longus'], view: 'back',
  },
  {
    id: 'tendon-glides', title: 'Finger tendon glides', kind: 'mobility', regions: [15, 14],
    why: 'Moves the finger tendons through their full path; helps stiff, achy hands and wrists.',
    steps: [
      'Start with fingers straight.',
      'Move through: hook fist (bend the top two finger joints) → full fist → straight fist (bend at the knuckles only) → back to straight.',
    ],
    dose: '5–10 rounds, a few times a day', targets: ['Flexor digitorum superficialis', 'Flexor digitorum profundus', 'Lumbrical muscles of hand'], view: 'front',
    activities: ['Phone / laptop use'], painTypes: ['Stiffness'],
  },
  {
    id: 'keyboard-wrist', title: 'Neutral wrists at the keyboard', kind: 'habit', regions: [15, 14, 13],
    why: 'Bent wrists while typing or using a mouse for hours strain the forearm tendons.',
    steps: [
      'Keep wrists straight, hovering or lightly resting — not bent up or sideways.',
      'Elbows at about 90°, close to your sides.',
      'Mouse close to the keyboard; change hands or take a break now and then.',
    ],
    dose: 'Set up once; check daily', activities: ['Phone / laptop use', 'Sitting / desk work'],
  },
  {
    id: 'grip-relax', title: 'Relax your grip', kind: 'habit', regions: [13, 14, 15],
    why: 'Squeezing tools, phones, steering wheels or bags tightly for long periods overloads the forearm.',
    steps: ['Notice when you’re gripping hard and soften it.', 'Use both hands or a strap for heavy bags; use a phone stand.'],
    dose: 'Ongoing', activities: ['Phone / laptop use', 'Driving', 'Lifting / carrying'],
  },

  // ------------------------------------------------------------------ general
  {
    id: 'sleep-routine', title: 'Protect your sleep', kind: 'habit', regions: [8, 3, 1, 6, 7, 4],
    why: 'Short or poor sleep makes the body more sensitive to pain the next day.',
    steps: [
      'Aim for 7–9 hours with a regular bedtime.',
      'Wind down without screens for 30 minutes before bed.',
      'If pain wakes you, try a pillow between the knees (side sleeping) or under the knees (back sleeping).',
    ],
    dose: 'Nightly', activities: MORNING,
  },
];

const byId = new Map(REMEDIES.map((r) => [r.id, r]));
export const remedyById = (id: string) => byId.get(id);
