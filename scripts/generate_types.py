"""Generate TypeScript type definitions from Pydantic models.
Usage: py scripts/generate_types.py > src/api-types.ts
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))

from pydantic import BaseModel
from typing import get_type_hints, get_origin, get_args, Optional, List, Dict

def resolve_typename(tp) -> str:
    origin = get_origin(tp)
    args = get_args(tp)

    if origin is list or origin is List:
        inner = resolve_typename(args[0]) if args else 'any'
        return f'{inner}[]'
    if origin is dict or origin is Dict:
        v = resolve_typename(args[1]) if len(args) > 1 else 'any'
        return f'Record<string, {v}>'
    if origin is Optional or type(None) in args:
        non_none = [a for a in args if a is not type(None)]
        inner = resolve_typename(non_none[0]) if non_none else 'any'
        return f'{inner} | null'

    name = getattr(tp, '__name__', str(tp))
    if name == 'int': return 'number'
    if name == 'float': return 'number'
    if name == 'str': return 'string'
    if name == 'bool': return 'boolean'
    if name == 'datetime': return 'string'
    if name == 'date': return 'string'
    if name == 'Any': return 'any'
    if name == 'dict': return 'Record<string, any>'
    return name

def model_to_ts(model: type[BaseModel], models_map: dict) -> str:
    hints = get_type_hints(model)
    fields = {}
    for name, tp in hints.items():
        if name.startswith('_'):
            continue
        fields[name] = tp

    model_fields = getattr(model, 'model_fields', {})
    optional_names = set()

    # Manual overrides for fields that can't be inferred from Pydantic types
    OVERRIDES: dict[tuple[str, str], str] = {
        ('StorylineAssignment', 'involved_with'): '{ uid: number; name: string; alignment: number; major_role: boolean }[]',
        ('WorkerPerformance', 'best_segment_info'): '{ rating: number; log_entry: string; label: string; card: string }',
        ('WorkerPerformance', 'worst_segment_info'): '{ rating: number; log_entry: string; label: string; card: string }',
        ('WorkerPerformance', 'best_match_info'): '{ rating: number; log_entry: string; label: string; card: string }',
        ('WorkerPerformance', 'worst_match_info'): '{ rating: number; log_entry: string; label: string; card: string }',
        ('WorkerPerformance', 'best_angle_info'): '{ rating: number; log_entry: string; label: string; card: string }',
        ('WorkerPerformance', 'worst_angle_info'): '{ rating: number; log_entry: string; label: string; card: string }',
        ('WorkerPerformance', 'last_5_match_ratings'): '{ rating: number; label: string; card: string; log_entry: string }[]',
        ('WorkerPerformance', 'last_5_angle_ratings'): '{ rating: number; label: string; card: string; log_entry: string }[]',
        ('WorkerPerformance', 'last_5_segment_ratings'): '{ rating: number; label: string; card: string; log_entry: string }[]',
        ('Worker', 'belt_history'): '{ belt_uid: number; belt_name: string; belt_picture: string; captured: string; lost: string; defences: number }[]',
        ('Worker', 'moves'): '{ name: string; desc: string; level: number }[]',
        ('Worker', 'home_region_pop'): 'RatingDisplay',
        ('Worker', 'Gender'): 'number',
        ('Worker', 'all_fed_ids'): 'number[]',
        ('Worker', 'attributes'): 'number[]',
        ('Worker', 'Business'): 'number',
        ('Worker', 'Booking_Reputation'): 'number',
        ('Worker', 'Booking_Skill'): 'number',
        ('TagTeam', 'active'): 'boolean',
        ('Stable', 'members'): '{ uid: number; name: string; picture: string; leader: boolean }[]',
    }
    for fname, field in model_fields.items():
        ann = field.annotation
        if ann is None:
            continue
        args = get_args(ann)
        origin = get_origin(ann)
        if origin is Optional:
            optional_names.add(fname)
        elif args and type(None) in args:
            optional_names.add(fname)

    lines = [f'export interface {model.__name__} {{']
    seen = set()
    for name, tp in hints.items():
        if name.startswith('_'):
            continue
        seen.add(name)
        override = OVERRIDES.get((model.__name__, name))
        if override:
            optional = '?' if name in optional_names else ''
            lines.append(f'  {name}{optional}: {override};')
        else:
            ts_type = resolve_typename(tp)
            optional = '?' if name in optional_names else ''
            lines.append(f'  {name}{optional}: {ts_type};')
    # Add any overrides for fields not in type hints (runtime-only fields)
    for (mname, fname), override in OVERRIDES.items():
        if mname == model.__name__ and fname not in seen:
            lines.append(f'  {fname}?: {override};')
    lines.append('}')
    lines.append('')
    return '\n'.join(lines)


def main():
    # Import all models
    from models import (
        RatingDisplay, WorkerSkills, WorkerPhysical, WorkerContract,
        OvernessEntry, WinLoss, StorylineAssignment, WorkerPerformance,
        TagTeamInfo, TagTeam, StableInfo, ChemistryInfo, Worker,
        Federation, Stable, Belt, GameInfo, Narrative, Storyline,
    )

    models = [
        RatingDisplay, WorkerSkills, WorkerPhysical, WorkerContract,
        OvernessEntry, WinLoss, StorylineAssignment, WorkerPerformance,
        TagTeamInfo, TagTeam, StableInfo, ChemistryInfo, Worker,
        Federation, Stable, Belt, GameInfo, Narrative, Storyline,
    ]

    models_map = {m.__name__: m for m in models}

    print('// Auto-generated from python/models.py — do not edit directly')
    print('// Run: py scripts/generate_types.py > src/api-types.ts')
    print()

    for model in models:
        if model.__name__ == 'BaseModel':
            continue
        output = model_to_ts(model, models_map)
        print(output)


if __name__ == '__main__':
    main()
