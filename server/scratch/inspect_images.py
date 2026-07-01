import urllib.request
from PIL import Image
import io

urls = {
    "Lonavala Weekend Getaway": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850619/renuka-tours/packages/kwvjyqzcxy34tmyev9sr.jpg",
    "Karjat Nature Escape": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850598/renuka-tours/packages/f3rezre9priiri90ky0g.jpg",
    "Igatpuri Getaway": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850569/renuka-tours/packages/k7a6zwt3kenfpiexkbg4.jpg",
    "Saputara Hill Station Tour": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850541/renuka-tours/packages/eeiddbvjgztdb2kih2kl.jpg",
    "Tuljapur Darshan": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850521/renuka-tours/packages/qatpmm7tdb4gsak3h1p2.jpg",
    "Akkalkot Darshan": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850505/renuka-tours/packages/dxiegtolazlb5i0irqmv.jpg",
    "Pandharpur Darshan": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850489/renuka-tours/packages/p9py9vk4q4tbp9ftalky.jpg",
    "Jejuri Darshan": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850471/renuka-tours/packages/cn98qlebk74dxjj5lmxq.jpg",
    "Ekvira Devi Darshan": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850455/renuka-tours/packages/vdz5e1uhxnxc43jfqdda.jpg",
    "Ganpatipule Tour": "https://res.cloudinary.com/osfkcnuo/image/upload/v1782850435/renuka-tours/packages/wjquihltquuiccmedpkj.jpg",
}

for name, url in urls.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            img_data = response.read()
            img = Image.open(io.BytesIO(img_data))
            w, h = img.size
            ratio = w / h
            print(f"Name: {name}")
            print(f"  Dimensions: {w}x{h}")
            print(f"  Aspect Ratio: {ratio:.2f}")
    except Exception as e:
        print(f"Error {name}: {e}")
