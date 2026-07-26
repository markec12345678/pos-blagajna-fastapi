import json

d = json.load(open('coverage.json'))

files = []
for f, data in d['files'].items():
    s = data['summary']
    pct = s['percent_covered']
    missed = s['missing_lines']
    total = s['num_statements']
    files.append((pct, f, missed, total))

files.sort()

# Show uncovered files (below 50%)
print("=== Backend files below 50% coverage ===")
low = [(p, f, m, t) for p, f, m, t in files if p < 50]
for pct, fname, missed, total in low[-30:]:
    print(f"  {pct:5.1f}%  {fname}  ({missed} missed of {total})")

print(f"\nTotal: {len(files)} files, {len(low)} below 50%")

# Show files with 0% coverage
zero = [(p, f, m, t) for p, f, m, t in files if p == 0]
print(f"Files with 0% coverage: {len(zero)}")
for _, fname, _, _ in zero[:20]:
    print(f"  {fname}")

# Show files above 90%
high = [(p, f, m, t) for p, f, m, t in files if p >= 90]
print(f"\nFiles >= 90% coverage: {len(high)}")
for pct, fname, _, _ in high:
    print(f"  {pct:5.1f}%  {fname}")
