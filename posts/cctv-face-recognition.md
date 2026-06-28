title: AI Demos Are Easy. Real CCTV Feeds Are Not.
subtitle: Deploying face recognition across 6,500 cameras at one of India's largest universities
author: Kaushal Choudhary
date: 2026-05-10
# AI Demos Are Easy. Real CCTV Feeds Are Not.

![cctv-hero](/images/cctv-hero.webp)

Face recognition is one of the easiest ways to improve security across large campuses, offices, and public spaces. On paper, modern face recognition models are incredibly accurate.

In reality, most deployments fail the moment they leave controlled demo environments.

Recently, I was leading an AI deployment at one of India's largest private universities. The campus had more than 6,500 CCTV cameras spread across classrooms, roads, hostels, parking lots, and entry gates.

The goal was straightforward:

* recognize students and staff entering the campus
* detect watchlist individuals
* run everything in real-time on edge devices

The problem? The camera infrastructure was never designed for AI.

Most of the campus still used old 2MP analog CCTV cameras, along with a few digital IP cameras. They were acceptable for surveillance, but terrible for face recognition:

* low bitrate streams
* motion blur
* unstable FPS
* poor lighting at night
* jittery RTSP feeds
* distant faces captured from 10–12 feet height

![cctv-challenges](/images/cctv-challenges.webp)
*Frames were not being captured cleanly enough for good face recognition.*

Inside the control room, the feeds looked far worse than the polished datasets most face recognition systems are benchmarked on.

Some streams lagged heavily. Some randomly disconnected. Some compressed faces so aggressively that basic facial details disappeared entirely.

And we had to make this system work in under a week.

# The Hardware Setup

![cctv-architecture](/images/cctv-architecture.webp)
*Distributed edge inference with real-time streaming.*

Our deployment architecture used three edge inference devices connected directly to the campus surveillance network.

Each device had:

* 8GB RAM
* integrated NVIDIA GPU
* 256GB local storage
* local inference processing

Instead of sending every video stream to a centralized GPU server, each edge node processed its own camera streams locally and then forwarded events to a master node.

This distributed inference architecture helped reduce:

* bandwidth pressure
* central GPU bottlenecks
* latency spikes

while also making the deployment easier to scale across large campuses.

# The Face Recognition Pipeline

For face recognition, we used InsightFace's `buffalo_l` model bundle, customized and tuned for Indian face datasets including:

* turbans
* caps
* masks
* sunglasses
* difficult lighting conditions

The internal pipeline used two primary ONNX models.

## 1. Detection

A RetinaFace-based SCRFD detector responsible for locating faces inside each frame.

## 2. Recognition

An ArcFace ResNet-50 model that generated 512-dimensional embeddings for every detected face.

These embeddings are numerical representations of facial features. Matching happened using cosine similarity between embeddings.

Under real deployment conditions, the full runtime inference pipeline consumed close to ~880MB of GPU memory per loaded worker.

That immediately became a problem.

On constrained edge hardware, loading separate model workers for every camera stream would quickly exhaust available GPU memory.

So instead of running one model process per stream, we built a shared inference architecture:

* one shared inference worker
* multiple camera streams
* centralized batching and inference queues

This allowed multiple CCTV streams to reuse the same loaded model pipeline without duplicating GPU memory usage.

Without this optimization, the edge devices would run out of memory after only a few active streams.

# Why ONNX Runtime Wasn't Enough

Initially, the models ran using ONNX Runtime. It worked.

But once multiple crowded camera feeds started processing simultaneously, latency increased rapidly.

The biggest issue wasn't a single face. It was crowd density.

A single frame could contain:

* dozens of partial faces
* motion blur
* occlusions
* tiny low-quality crops

Generating embeddings for every detected face became extremely expensive.

This is where TensorRT changed everything.

TensorRT optimized the ONNX models specifically for NVIDIA hardware by:

* fusing operations into optimized CUDA kernels
* reducing precision with minimal accuracy loss
* optimizing memory allocations
* improving execution throughput

The same models now ran:

* faster
* with lower memory usage
* lower latency
* more stable sustained inference

which mattered far more than peak benchmark numbers.

# The System Still Failed

At this point, the system was technically stable. The streams were running. The models were loaded. GPU OOM crashes were mostly gone.

But the actual face recognition was still terrible.

Known people stood directly in front of the camera for multiple seconds and still failed to match. Sometimes completely wrong people matched instead.

This became the real debugging phase.

For nearly 2–3 days straight, we tried almost everything:

* changing cosine similarity thresholds
* increasing detection thresholds
* adding image preprocessing
* face upscaling
* changing camera angles
* improving lighting
* switching to better cameras
* adjusting stream quality
* tuning crop padding
* modifying embedding filtering

Nothing consistently worked.

At first, we thought the problem was purely model accuracy. It wasn't.

The actual issue was much deeper: the entire inference pipeline was too slow for the kind of CCTV environment we were operating in.

# The Real Problem: Low Effective Inference Throughput

The biggest breakthrough came after profiling the entire pipeline end-to-end.

Even though the camera streams themselves were running at higher FPS, the effective end-to-end recognition throughput sometimes dropped below 1 FPS per stream under realistic crowded conditions.

That meant:

* faces were constantly being skipped
* diagonal walking angles only produced a few usable frames
* motion blur destroyed embeddings
* detections happened too late
* many usable frames never reached inference in time

At one point, we recorded a student walking across the frame and replayed the pipeline step-by-step. The system had only processed a couple of usable recognition frames during the entire crossing. By the time the embedding pipeline processed the frame, the person had already exited the camera view.

That explained almost everything. The system simply wasn't observing enough good facial samples in time.

# Why The Pipeline Became So Slow

The hardware constraints were brutal.

Each edge device had:

* 8GB shared CPU/GPU memory
* multiple live RTSP streams
* nearly ~900MB of active face recognition runtime memory
* a separate embedding service consuming additional GPU memory
* multiple camera workers
* continuous video decoding
* TensorRT inference
* hundreds of test identities in memory

And unlike cloud GPUs, integrated edge devices share memory between:

* CUDA
* video decode
* system RAM
* inference buffers

So memory pressure affected everything. Even small spikes could:

* slow inference
* increase latency
* stall queues
* trigger OOM risks

Initially, parts of the pipeline still triggered slower execution paths outside the fully optimized TensorRT pipeline. Some processing paths were still leaking into slower CPU-backed execution. That completely destroyed latency consistency.

CPU-backed execution inside a real-time multi-stream inference pipeline is catastrophic because queue buildup compounds rapidly:

* delayed frames
* stale detections
* outdated embeddings
* lower effective inference throughput

Externally, the system looked operational. Internally, inference was continuously falling behind.

# The Enrollment Data Was Also Bad

Even after fixing most inference bottlenecks, we still got incorrect matches.

Then we realized another major issue: the enrollment images themselves were terrible.

Most face recognition demos assume:

* front-facing faces
* sharp enrollment photos
* clean lighting
* high-quality crops

We had none of that.

This deployment involved more than 50,000 students and faculty members. Re-enrolling everyone using DSLR-quality images was impossible.

Most enrollment photos were:

* blurry
* compressed
* unevenly lit
* screenshots
* photos of printed passport photos
* low-resolution uploads

Some already contained visible artifacts before even entering the pipeline.

Then we tried matching those poor-quality enrollment embeddings against:

* noisy analog CCTV feeds
* ultra-wide camera distortion
* motion blur
* diagonal walking angles
* low-light conditions
* distant faces

At that point, recognition became significantly harder. The detector struggled on ultra-wide surveillance feeds with small distant faces and aggressive compression artifacts. Small blurry crops produced unstable embeddings and inconsistent cosine similarity scores.

# What Finally Worked

![cctv-throughput](/images/cctv-throughput.webp)

The final solution was surprisingly simple compared to all the complex tuning we attempted.

The biggest improvement came from increasing the effective usable inference throughput.

We optimized aggressively:

* frame skipping logic
* TensorRT-only execution
* batching behavior
* embedding filtering
* queue pressure
* memory usage
* CPU fallback removal

We also added slight face upscaling before recognition for very small crops.

After optimization, the pipeline consistently processed around **8–9 FPS**, instead of sub-1 to 2 FPS under load.

That completely changed recognition behavior.

Why?

Because face recognition on CCTV is probabilistic. You do not need every frame to be perfect. You only need:

* a few clean frames
* good face alignment
* stable embeddings
* enough temporal opportunities

At extremely low effective FPS, the system barely had opportunities to observe usable faces. At 8–9 FPS, the probability of capturing at least a few clean facial crops increased dramatically.

False matches dropped. Recognition consistency improved. Tracking became more stable.

And finally, the system started behaving like an actual production deployment instead of a benchmark demo.

We successfully completed the deployment shortly after.

# The Biggest Lesson

The hardest part of face recognition wasn't the neural network. It was everything around it:

* camera quality
* enrollment quality
* stream stability
* inference throughput
* queue latency
* memory pressure
* deployment architecture
* threshold tuning

Most AI demos work on curated, clean, high-quality images and videos. Real CCTV never has perfect data.

Hope you liked reading it — follow for more real engineering stories.
