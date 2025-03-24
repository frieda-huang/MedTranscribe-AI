# This file generates synthetic medical transcripts using gemma3:latest

import json
import urllib.request
import random
import os
import argparse
from tqdm import tqdm

# Define medical specialties and common conditions for variety
SPECIALTIES = [
    "Family Medicine",
    "Internal Medicine",
    "Cardiology",
    "Pulmonology",
    "Gastroenterology",
    "Endocrinology",
    "Neurology",
    "Orthopedics",
    "Dermatology",
    "Psychiatry",
]

COMMON_CONDITIONS = [
    "Hypertension",
    "Type 2 Diabetes",
    "Asthma",
    "COPD",
    "Coronary Artery Disease",
    "Osteoarthritis",
    "Depression",
    "Anxiety",
    "GERD",
    "Migraine",
    "Lower Back Pain",
    "Hypothyroidism",
    "Allergic Rhinitis",
    "Urinary Tract Infection",
]


def query_model(
    prompt, model="gemma3:latest", url="http://localhost:11434/api/chat", role="user"
):
    """
    Query the gemma3:latest model through the Ollama API.

    Args:
        prompt (str): The prompt to send to the model.
        model (str): The model to use.
        url (str): The Ollama API endpoint.
        role (str): The role of the message sender.

    Returns:
        str: The model's response.
    """
    data = {
        "model": model,
        "temperature": 0.7,
        "top_p": 0.9,
        "messages": [{"role": role, "content": prompt}],
    }
    payload = json.dumps(data).encode("utf-8")
    request = urllib.request.Request(url, data=payload, method="POST")
    request.add_header("Content-Type", "application/json")

    response_data = ""
    try:
        with urllib.request.urlopen(request) as response:
            while True:
                line = response.readline().decode("utf-8")
                if not line:
                    break
                response_json = json.loads(line)
                response_data += response_json["message"]["content"]
    except Exception as e:
        print(f"Error querying model: {e}")
        return None

    return response_data


def generate_transcript_prompt(patient_id):
    """
    Generate a prompt for creating a medical transcript.

    Args:
        patient_id (str): The patient identifier

    Returns:
        str: A prompt for the language model that instructs it to produce only the simulated conversation.
    """
    specialty = random.choice(SPECIALTIES)
    conditions = random.sample(COMMON_CONDITIONS, k=random.randint(1, 3))
    age = random.randint(18, 85)
    gender = random.choice(["male", "female"])

    return f"""
Generate a realistic and detailed medical transcript as a dialogue between a {specialty} doctor and a {age}-year-old {gender} patient (Patient ID: {patient_id}). 

The patient has a history of {', '.join(conditions)}.

The transcript must only contain the dialogue with clear speaker labels (e.g., "Doctor:" and "Patient:"). Do not include any internal chain-of-thought, meta commentary, or any text enclosed in <think> ... </think> tags. Only include the simulated conversation.

The transcript should cover:
1. A greeting and introduction.
2. Patient history and background (including past medical history, medications, and allergies).
3. A detailed discussion of current symptoms and concerns.
4. Examination notes and observations by the doctor.
5. Diagnostic discussion.
6. A treatment plan with specific medication recommendations and dosages.
7. Patient education about their condition.
8. Follow-up instructions.
9. A natural back-and-forth dialogue between the doctor and the patient.

The transcript should be between 600-1000 words.
"""


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate synthetic medical transcripts using gemma3:latest"
    )
    parser.add_argument(
        "-n",
        "--num-transcripts",
        type=int,
        default=5,
        help="Number of transcripts to generate (default: 5)",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        type=str,
        default="generated_transcripts",
        help="Directory to save the generated transcripts (default: generated_transcripts)",
    )
    parser.add_argument(
        "-m",
        "--model",
        type=str,
        default="gemma3:latest",
        help="Model to use for generation (default: gemma3:latest)",
    )
    parser.add_argument(
        "-u",
        "--url",
        type=str,
        default="http://localhost:11434/api/chat",
        help="Ollama API URL (default: http://localhost:11434/api/chat)",
    )

    return parser.parse_args()


def main():
    # Parse command line arguments
    args = parse_arguments()

    # Prepare output directory
    dataset_size = args.num_transcripts
    dataset = []
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_dir = os.path.join(project_root, args.output_dir)
    os.makedirs(output_dir, exist_ok=True)

    print(f"Generating {dataset_size} medical transcripts using {args.model}...")
    for i in tqdm(range(dataset_size)):
        patient_id = f"P{1000 + i}"
        prompt = generate_transcript_prompt(patient_id)
        result = query_model(prompt, model=args.model, url=args.url)

        if result:
            transcript_entry = {"patient_id": patient_id, "transcript": result}
            dataset.append(transcript_entry)

            with open(f"{output_dir}/transcript_{patient_id}.txt", "w") as file:
                file.write(f"Patient ID: {patient_id}\n\n")
                file.write(result)

    combined_file = f"{output_dir}/all_transcripts.txt"
    with open(combined_file, "w") as file:
        for entry in dataset:
            file.write(f"\n{'='*80}\n")
            file.write(f"PATIENT ID: {entry['patient_id']}\n")
            file.write(f"{'='*80}\n\n")
            file.write(entry["transcript"])
            file.write("\n\n")

    print(f"Successfully generated {len(dataset)} medical transcripts")
    print(f"Individual transcripts saved in: {output_dir}")
    print(f"Combined text file saved to: {combined_file}")


if __name__ == "__main__":
    main()
