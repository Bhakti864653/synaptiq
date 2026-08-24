"use client";

import { useState } from "react";
import Button from "@/components/Button";

// A small, fixed (untrained — hand-picked) network. The point is showing the
// real arithmetic of a forward pass, not a trained model.
const W1 = [
  [0.5, -0.2, 0.9],
  [-0.4, 0.7, 0.1],
  [0.3, 0.3, -0.6],
];
const B1 = [0.1, -0.1, 0.2];
const W2 = [0.8, -0.5, 0.6];
const B2 = -0.2;

const SAMPLES: { key: string; label: string; values: [number, number, number] }[] = [
  { key: "a", label: "Sample A", values: [0.8, 0.3, 0.1] },
  { key: "b", label: "Sample B", values: [-0.5, 0.9, -0.3] },
  { key: "c", label: "Sample C", values: [0.2, -0.7, 0.6] },
];

function relu(x: number) {
  return Math.max(0, x);
}
function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}
function round(x: number) {
  return Math.round(x * 1000) / 1000;
}

const STEP_LABELS = [
  "Pick an input",
  "1. Hidden layer — weighted sums",
  "2. Hidden layer — ReLU activation",
  "3. Output layer — weighted sum",
  "4. Output layer — sigmoid activation",
];

// Layout, in a 320x220 viewBox.
const INPUT_X = 40;
const HIDDEN_X = 160;
const OUTPUT_X = 280;
const INPUT_Y = [40, 110, 180];
const HIDDEN_Y = [40, 110, 180];
const OUTPUT_Y = 110;
const R = 18;

export default function ForwardPassDemo() {
  const [selected, setSelected] = useState(SAMPLES[0]);
  const [step, setStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const hiddenRaw = W1.map(
    (weights, i) => weights[0] * selected.values[0] + weights[1] * selected.values[1] + weights[2] * selected.values[2] + B1[i],
  );
  const hiddenActivated = hiddenRaw.map(relu);
  const outputRaw = W2[0] * hiddenActivated[0] + W2[1] * hiddenActivated[1] + W2[2] * hiddenActivated[2] + B2;
  const outputActivated = sigmoid(outputRaw);

  function pickSample(sample: (typeof SAMPLES)[number]) {
    setSelected(sample);
    setStep(0);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Interactive forward-pass demo</h2>
        <p className="text-sm text-ink-muted">
          Drag a sample input onto the network below (or just click one), then step through exactly
          how it turns into a prediction — the same arithmetic {"—"} weighted sum, bias, activation
          {"—"} the material describes, run on real numbers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((sample) => (
          <div
            key={sample.key}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", sample.key)}
            onClick={() => pickSample(sample)}
            className={`cursor-grab rounded-lg border px-3 py-2 font-mono text-sm transition-colors active:cursor-grabbing ${
              selected.key === sample.key
                ? "border-brand text-brand"
                : "border-line text-ink-muted hover:border-brand hover:text-brand"
            }`}
          >
            {sample.label}: [{sample.values.join(", ")}]
          </div>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const key = e.dataTransfer.getData("text/plain");
          const sample = SAMPLES.find((s) => s.key === key);
          if (sample) pickSample(sample);
        }}
        className={`rounded-xl border p-3 transition-colors ${dragOver ? "border-brand bg-brand/5" : "border-line bg-surface"}`}
      >
        <svg viewBox="0 0 320 220" className="w-full">
          {W1.map((weights, h) =>
            INPUT_Y.map((iy, i) => (
              <line
                key={`i${i}h${h}`}
                x1={INPUT_X + R}
                y1={iy}
                x2={HIDDEN_X - R}
                y2={HIDDEN_Y[h]}
                stroke="var(--line)"
                strokeWidth={1}
              />
            )),
          )}
          {HIDDEN_Y.map((hy) => (
            <line
              key={`h-out-${hy}`}
              x1={HIDDEN_X + R}
              y1={hy}
              x2={OUTPUT_X - R}
              y2={OUTPUT_Y}
              stroke="var(--line)"
              strokeWidth={1}
            />
          ))}

          {selected.values.map((v, i) => (
            <g key={`in-${i}`}>
              <circle cx={INPUT_X} cy={INPUT_Y[i]} r={R} fill="var(--surface)" stroke="var(--brand)" strokeWidth={2} />
              <text x={INPUT_X} y={INPUT_Y[i] + 4} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill="var(--ink)">
                {v}
              </text>
            </g>
          ))}

          {HIDDEN_Y.map((hy, i) => {
            const show = step >= 1;
            const val = step >= 2 ? hiddenActivated[i] : step >= 1 ? hiddenRaw[i] : null;
            return (
              <g key={`hid-${i}`}>
                <circle
                  cx={HIDDEN_X}
                  cy={hy}
                  r={R}
                  fill="var(--surface)"
                  stroke={show ? "var(--brand)" : "var(--line)"}
                  strokeWidth={2}
                />
                {val !== null && (
                  <text x={HIDDEN_X} y={hy + 4} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--ink)">
                    {round(val)}
                  </text>
                )}
              </g>
            );
          })}

          <circle
            cx={OUTPUT_X}
            cy={OUTPUT_Y}
            r={R}
            fill="var(--surface)"
            stroke={step >= 3 ? "var(--brand)" : "var(--line)"}
            strokeWidth={2}
          />
          {step >= 3 && (
            <text x={OUTPUT_X} y={OUTPUT_Y + 4} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--ink)">
              {round(step >= 4 ? outputActivated : outputRaw)}
            </text>
          )}

          <text x={INPUT_X} y={16} textAnchor="middle" fontSize={9} fill="var(--ink-muted)">Input</text>
          <text x={HIDDEN_X} y={16} textAnchor="middle" fontSize={9} fill="var(--ink-muted)">Hidden (ReLU)</text>
          <text x={OUTPUT_X} y={16} textAnchor="middle" fontSize={9} fill="var(--ink-muted)">Output (sigmoid)</text>
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">{STEP_LABELS[step]}</p>

        {step === 0 && (
          <p className="text-sm text-ink-muted">Click "Next" to compute the first hidden layer.</p>
        )}

        {step >= 1 && (
          <div className="flex flex-col gap-1 font-mono text-xs text-ink-muted">
            {W1.map((weights, i) => (
              <p key={i}>
                h{i + 1} = {weights[0]}×{selected.values[0]} + {weights[1]}×{selected.values[1]} +{" "}
                {weights[2]}×{selected.values[2]} + {B1[i]} = <span className="text-ink">{round(hiddenRaw[i])}</span>
              </p>
            ))}
          </div>
        )}

        {step >= 2 && (
          <div className="flex flex-col gap-1 font-mono text-xs text-ink-muted">
            {hiddenRaw.map((raw, i) => (
              <p key={i}>
                ReLU({round(raw)}) = <span className="text-ink">{round(hiddenActivated[i])}</span>
              </p>
            ))}
          </div>
        )}

        {step >= 3 && (
          <p className="font-mono text-xs text-ink-muted">
            output = {W2[0]}×{round(hiddenActivated[0])} + {W2[1]}×{round(hiddenActivated[1])} + {W2[2]}×
            {round(hiddenActivated[2])} + {B2} = <span className="text-ink">{round(outputRaw)}</span>
          </p>
        )}

        {step >= 4 && (
          <p className="font-mono text-xs text-ink-muted">
            sigmoid({round(outputRaw)}) = <span className="font-medium text-brand">{round(outputActivated)}</span>
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="secondary"
            onClick={() => setStep(0)}
            disabled={step === 0}
            className="w-fit"
          >
            Reset
          </Button>
          <Button onClick={() => setStep((s) => Math.min(s + 1, 4))} disabled={step >= 4} className="w-fit">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
