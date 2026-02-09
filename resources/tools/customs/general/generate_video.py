"""
Veo 3.1 비디오 생성 스크립트 (음성 포함)
"""
import argparse
import os
import time
import sys
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types


def main():
    parser = argparse.ArgumentParser(
        description="Generate videos using Veo 3.1 model with audio support",
        epilog="""
Examples:
  # Generate new video
  python generate_video.py --prompt "바다 위를 나는 갈매기"
  python generate_video.py --prompt "A cat playing piano" --duration 8 --resolution 1080p
  python generate_video.py --prompt-file prompt.txt --output-dir ./videos
  python generate_video.py --prompt "도시의 야경" --aspect-ratio 9:16 --sample-count 2

  # Extend existing video (+7 seconds per round)
  python generate_video.py --prompt "Camera moves deeper" --extend video.mp4
  python generate_video.py --extend video.mp4 --extend-prompts prompts.txt --output-name extended
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    # Mutually exclusive group for prompt input
    prompt_group = parser.add_mutually_exclusive_group(required=False)
    prompt_group.add_argument(
        "--prompt",
        type=str,
        help="Prompt text for video generation"
    )
    prompt_group.add_argument(
        "--prompt-file",
        type=str,
        help="Path to file containing the prompt text"
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default=".",
        help="Directory where the generated video is saved (default: current directory)"
    )
    parser.add_argument(
        "--output-name",
        type=str,
        default="generated_video",
        help="Output filename without extension (default: generated_video)"
    )
    parser.add_argument(
        "--api-key",
        type=str,
        help="Gemini API key (overrides .env file)"
    )
    parser.add_argument(
        "--aspect-ratio",
        type=str,
        choices=["16:9", "9:16"],
        default="16:9",
        help="Video aspect ratio (default: 16:9)"
    )
    parser.add_argument(
        "--duration",
        type=int,
        choices=[4, 6, 8],
        default=8,
        help="Video duration in seconds (default: 8)"
    )
    parser.add_argument(
        "--resolution",
        type=str,
        choices=["720p", "1080p"],
        default="720p",
        help="Video resolution (default: 720p)"
    )
    parser.add_argument(
        "--negative-prompt",
        type=str,
        help="Negative prompt to exclude unwanted content"
    )
    parser.add_argument(
        "--no-audio",
        action="store_true",
        help="Disable audio generation (default: audio enabled)"
    )
    parser.add_argument(
        "--sample-count",
        type=int,
        default=1,
        choices=[1, 2, 3, 4],
        help="Number of videos to generate (default: 1)"
    )
    parser.add_argument(
        "--person",
        type=str,
        choices=["allow_adult", "disallow"],
        default="allow_adult",
        help="Person generation policy (default: allow_adult)"
    )
    parser.add_argument(
        "--extend",
        type=str,
        help="Path to a Veo-generated MP4 file to extend (+7 seconds per round)"
    )
    parser.add_argument(
        "--extend-prompts",
        type=str,
        help="Path to file with one prompt per line for multi-round extension (overrides --prompt)"
    )
    parser.add_argument(
        "--extend-count",
        type=int,
        default=1,
        help="Number of extension rounds when using --prompt with --extend (default: 1)"
    )

    args = parser.parse_args()

    # Validate prompt requirement
    if not args.extend_prompts and not args.prompt and not args.prompt_file:
        parser.error("--prompt or --prompt-file is required (unless using --extend-prompts)")

    # Load API key
    if args.api_key:
        api_key = args.api_key
    else:
        env_path = os.path.join('.', 'tools', '.env')
        load_dotenv(env_path)
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            parser.error("GEMINI_API_KEY not found in .env file. Use --api-key to provide it.")

    # Get prompt
    prompt = None
    if args.prompt:
        prompt = args.prompt
    elif args.prompt_file:
        try:
            with open(args.prompt_file, 'r', encoding='utf-8') as f:
                prompt = f.read().strip()
        except FileNotFoundError:
            print(f"Error: Prompt file not found: {args.prompt_file}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"Error reading prompt file: {e}", file=sys.stderr)
            sys.exit(1)

    # Create output directory if needed
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Read extension prompts if provided
    extend_prompts = []
    if args.extend_prompts:
        try:
            with open(args.extend_prompts, 'r', encoding='utf-8') as f:
                extend_prompts = [line.strip() for line in f if line.strip()]
        except Exception as e:
            print(f"Error reading extend-prompts file: {e}", file=sys.stderr)
            sys.exit(1)

    # Generate or extend video
    try:
        client = genai.Client(api_key=api_key)

        def poll_operation(op):
            while not op.done:
                time.sleep(10)
                print(".", end="", flush=True)
                op = client.operations.get(op)
            print(" Done!")
            return op

        def extend_video(video, prompts):
            total_rounds = len(prompts)
            for i, ext_prompt in enumerate(prompts):
                round_num = i + 1
                print(f"\n[Extension {round_num}/{total_rounds}] +7s")
                print(f"  Prompt: {ext_prompt}")
                print(f"  Generating...", end="", flush=True)

                operation = client.models.generate_videos(
                    model="veo-3.1-fast-generate-preview",
                    prompt=ext_prompt,
                    video=video,
                )
                operation = poll_operation(operation)

                video = operation.result.generated_videos[0].video
                video_uri = video.uri  # Preserve API URI

                if total_rounds > 1:
                    save_path = output_dir / f"{args.output_name}_round{round_num}.mp4"
                else:
                    save_path = output_dir / f"{args.output_name}.mp4"

                client.files.download(file=video)
                video.save(str(save_path))
                print(f"  Saved: {save_path}")

                # Reconstruct Video with API URI for next round
                video = types.Video(uri=video_uri)

            print(f"\nExtension complete! Total added: +{total_rounds * 7}s")
            return video

        if args.extend:
            # === EXTEND FROM FILE MODE ===
            extend_path = Path(args.extend)
            if not extend_path.exists():
                print(f"Error: Video file not found: {args.extend}", file=sys.stderr)
                sys.exit(1)

            prompts = extend_prompts if extend_prompts else [prompt] * args.extend_count

            print(f"Extending video... (model: veo-3.1-fast-generate-preview)")
            print(f"  Source: {args.extend}")
            print(f"  Rounds: {len(prompts)} (+{len(prompts) * 7}s)")

            print(f"  Uploading source video...", end="", flush=True)
            uploaded_file = client.files.upload(file=str(extend_path))
            while uploaded_file.state.name == "PROCESSING":
                time.sleep(5)
                print(".", end="", flush=True)
                uploaded_file = client.files.get(name=uploaded_file.name)
            print(" Done!")

            video = types.Video(uri=uploaded_file.uri)
            extend_video(video, prompts)

        elif extend_prompts:
            # === GENERATE + EXTEND MODE ===
            print(f"[Phase 1] Generating base video... (model: veo-3.1-fast-generate-preview)")
            print(f"  Prompt: {prompt}")
            print(f"  Duration: {args.duration}s, Aspect: {args.aspect_ratio}")
            print(f"  Then extending: {len(extend_prompts)} rounds (+{len(extend_prompts) * 7}s)")

            config = types.GenerateVideosConfig(
                aspect_ratio=args.aspect_ratio,
                duration_seconds=args.duration,
                negative_prompt=args.negative_prompt,
            )

            operation = client.models.generate_videos(
                model="veo-3.1-fast-generate-preview",
                prompt=prompt,
                config=config,
            )

            print("  Waiting...", end="", flush=True)
            operation = poll_operation(operation)

            video = operation.result.generated_videos[0].video
            video_uri = video.uri  # Preserve API URI before download

            base_path = output_dir / f"{args.output_name}_base.mp4"
            client.files.download(file=video)
            video.save(str(base_path))
            print(f"  Base saved: {base_path}")

            # Reconstruct Video with original API URI for extension
            video_ref = types.Video(uri=video_uri)
            print(f"\n[Phase 2] Extending video...")
            extend_video(video_ref, extend_prompts)

        else:
            # === GENERATE MODE ===
            print(f"Generating video... (model: veo-3.1-fast-generate-preview)")
            print(f"  Prompt: {prompt}")
            print(f"  Duration: {args.duration}s, Aspect: {args.aspect_ratio}, Resolution: {args.resolution}")
            print(f"  Audio: {'enabled' if not args.no_audio else 'disabled'}")
            if args.negative_prompt:
                print(f"  Negative prompt: {args.negative_prompt}")
            if args.sample_count > 1:
                print(f"  Sample count: {args.sample_count}")

            config = types.GenerateVideosConfig(
                aspect_ratio=args.aspect_ratio,
                duration_seconds=args.duration,
                number_of_videos=args.sample_count,
                negative_prompt=args.negative_prompt,
            )

            operation = client.models.generate_videos(
                model="veo-3.1-fast-generate-preview",
                prompt=prompt,
                config=config,
            )

            print("Waiting for video generation...", end="", flush=True)
            operation = poll_operation(operation)

            for i, generated_video in enumerate(operation.result.generated_videos):
                if args.sample_count > 1:
                    out_path = output_dir / f"{args.output_name}_{i+1}.mp4"
                else:
                    out_path = output_dir / f"{args.output_name}.mp4"

                client.files.download(file=generated_video.video)
                generated_video.video.save(str(out_path))
                print(f"Video saved: {out_path}")

    except Exception as e:
        print(f"Error generating video: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
