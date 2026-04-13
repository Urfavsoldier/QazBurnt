import math
from dataclasses import dataclass


KAZAKHSTAN_CENTER = (48.2, 67.4)
KAZAKHSTAN_BOUNDS = (40.0, 45.0, 56.0, 88.0)
EARTH_RADIUS_KM = 6371.0


@dataclass(frozen=True)
class Settlement:
    name: str
    region: str
    latitude: float
    longitude: float
    population: int


SETTLEMENTS = [
    Settlement("Семей", "Абайская область", 50.41, 80.23, 350967),
    Settlement("Бородулиха", "Абайская область", 50.72, 80.93, 5923),
    Settlement("Бескарагай", "Абайская область", 50.86, 78.02, 4768),
    Settlement("Кокшетау", "Акмолинская область", 53.28, 69.38, 150649),
    Settlement("Ерейментау", "Акмолинская область", 51.62, 73.10, 11640),
    Settlement("Баянаул", "Павлодарская область", 50.79, 75.70, 5934),
    Settlement("Катон-Карагай", "Восточно-Казахстанская область", 49.17, 85.61, 3710),
    Settlement("Костанай", "Костанайская область", 53.21, 63.63, 259412),
    Settlement("Наурзум", "Костанайская область", 51.54, 64.08, 2330),
    Settlement("Конаев", "Алматинская область", 43.88, 77.09, 54847),
    Settlement("Баканас", "Алматинская область", 44.81, 76.27, 5600),
    Settlement("Шолаккорган", "Туркестанская область", 43.77, 69.18, 8890),
    Settlement("Уральск", "Западно-Казахстанская область", 51.23, 51.37, 254084),
]


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def normalize(value: float, lower: float, upper: float) -> float:
    if upper == lower:
        return 0
    return clamp((value - lower) / (upper - lower), 0, 1)


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    d_lat = lat2 - lat1
    d_lon = lon2 - lon1
    value = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def bbox_around(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / max(35.0, 111.0 * math.cos(math.radians(lat)))
    south, west, north, east = KAZAKHSTAN_BOUNDS
    return (
        clamp(lon - lon_delta, west, east),
        clamp(lat - lat_delta, south, north),
        clamp(lon + lon_delta, west, east),
        clamp(lat + lat_delta, south, north),
    )


def destination_point(origin: tuple[float, float], bearing_deg: float, km: float) -> tuple[float, float]:
    lat, lon = origin
    angular = km / EARTH_RADIUS_KM
    theta = math.radians(bearing_deg)
    phi1 = math.radians(lat)
    lambda1 = math.radians(lon)
    phi2 = math.asin(math.sin(phi1) * math.cos(angular) + math.cos(phi1) * math.sin(angular) * math.cos(theta))
    lambda2 = lambda1 + math.atan2(
        math.sin(theta) * math.sin(angular) * math.cos(phi1),
        math.cos(angular) - math.sin(phi1) * math.sin(phi2),
    )
    return (math.degrees(phi2), math.degrees(lambda2))


def ellipse_polygon(
    origin: tuple[float, float],
    wind_direction_deg: int,
    forward_km: float,
    side_km: float,
    rear_km: float,
    irregularity: float = 0.04,
    points: int = 72,
) -> list[tuple[float, float]]:
    polygon: list[tuple[float, float]] = []
    for index in range(points + 1):
        theta = (2 * math.pi * index) / points
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)
        along = forward_km * cos_t if cos_t >= 0 else rear_km * cos_t
        cross = side_km * sin_t
        distance = math.hypot(along, cross)
        ripple = 1 + irregularity * math.sin(theta * 3.0) + irregularity * 0.55 * math.cos(theta * 5.0)
        local_bearing = math.degrees(math.atan2(cross, along))
        bearing = (wind_direction_deg + local_bearing + 360) % 360
        polygon.append(destination_point(origin, bearing, max(0.05, distance * ripple)))
    return polygon
