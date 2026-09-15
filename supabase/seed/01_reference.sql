-- Reference data: categories with attribute schemas, cities, and the demo seller.
-- Run once on a fresh database after the migrations.

insert into public.categories (slug, name, icon, position, attribute_schema) values
('mobiles','Mobiles','smartphone',1,'[{"key":"brand","label":"Brand","type":"text"},{"key":"storage_gb","label":"Storage","type":"select","unit":"GB","options":["32","64","128","256","512","1024"]},{"key":"battery_health","label":"Battery health","type":"number","unit":"%"}]'),
('vehicles','Cars','car',2,'[{"key":"brand","label":"Brand","type":"text"},{"key":"model","label":"Model","type":"text"},{"key":"year","label":"Year","type":"number"},{"key":"km","label":"Kilometres","type":"number","unit":"km"},{"key":"fuel","label":"Fuel","type":"select","options":["petrol","diesel","cng","electric","hybrid"]},{"key":"transmission","label":"Transmission","type":"select","options":["manual","automatic"]},{"key":"owners","label":"Owner number","type":"number"},{"key":"rc_number","label":"RC number","type":"text"},{"key":"insurance_until","label":"Insurance valid until","type":"date"}]'),
('bikes','Bikes','bike',3,'[{"key":"brand","label":"Brand","type":"text"},{"key":"model","label":"Model","type":"text"},{"key":"year","label":"Year","type":"number"},{"key":"km","label":"Kilometres","type":"number","unit":"km"},{"key":"fuel","label":"Fuel","type":"select","options":["petrol","electric","none"]},{"key":"owners","label":"Owner number","type":"number"},{"key":"rc_number","label":"RC number","type":"text"},{"key":"insurance_until","label":"Insurance valid until","type":"date"}]'),
('furniture','Furniture','sofa',4,'[{"key":"material","label":"Material","type":"text"}]'),
('electronics','Electronics','laptop',5,'[{"key":"brand","label":"Brand","type":"text"},{"key":"warranty_until","label":"Warranty until","type":"date"}]'),
('property','Property','home',6,'[{"key":"deal","label":"For","type":"select","options":["rent","sale","pg"]},{"key":"bhk","label":"BHK","type":"select","options":["1RK","1","2","3","4+"]},{"key":"area_sqft","label":"Area","type":"number","unit":"sq ft"},{"key":"furnishing","label":"Furnishing","type":"select","options":["unfurnished","semi","full"]}]'),
('fashion','Fashion','shirt',7,'[{"key":"size","label":"Size","type":"text"},{"key":"for","label":"For","type":"select","options":["women","men","unisex"]}]'),
('books','Books','book-open',8,'[{"key":"author","label":"Author","type":"text"},{"key":"language","label":"Language","type":"text"}]'),
('kids','Kids','baby',9,'[{"key":"age_group","label":"Age group","type":"select","options":["0-1","1-3","3-6","6-12"]}]'),
('hobbies','Hobbies','music',10,'[]'),
('pets','Pets','paw-print',11,'[{"key":"breed","label":"Breed","type":"text"},{"key":"age_months","label":"Age","type":"number","unit":"months"},{"key":"vaccinated","label":"Vaccinated","type":"boolean"}]'),
('services','Services','wrench',12,'[{"key":"service_area","label":"Service area","type":"text"}]');

insert into public.cities (name, state, slug, location)
select n, s, lower(regexp_replace(n, '[^A-Za-z]+', '-', 'g')), extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
from (values
('Mumbai','Maharashtra',19.0760,72.8777),('Delhi','Delhi',28.6139,77.2090),('Bengaluru','Karnataka',12.9716,77.5946),
('Hyderabad','Telangana',17.3850,78.4867),('Ahmedabad','Gujarat',23.0225,72.5714),('Chennai','Tamil Nadu',13.0827,80.2707),
('Kolkata','West Bengal',22.5726,88.3639),('Pune','Maharashtra',18.5204,73.8567),('Jaipur','Rajasthan',26.9124,75.7873),
('Surat','Gujarat',21.1702,72.8311),('Lucknow','Uttar Pradesh',26.8467,80.9462),('Kanpur','Uttar Pradesh',26.4499,80.3319),
('Nagpur','Maharashtra',21.1458,79.0882),('Indore','Madhya Pradesh',22.7196,75.8577),('Thane','Maharashtra',19.2183,72.9781),
('Bhopal','Madhya Pradesh',23.2599,77.4126),('Visakhapatnam','Andhra Pradesh',17.6868,83.2185),('Patna','Bihar',25.5941,85.1376),
('Vadodara','Gujarat',22.3072,73.1812),('Ghaziabad','Uttar Pradesh',28.6692,77.4538),('Ludhiana','Punjab',30.9010,75.8573),
('Agra','Uttar Pradesh',27.1767,78.0081),('Nashik','Maharashtra',19.9975,73.7898),('Faridabad','Haryana',28.4089,77.3178),
('Meerut','Uttar Pradesh',28.9845,77.7064),('Rajkot','Gujarat',22.3039,70.8022),('Varanasi','Uttar Pradesh',25.3176,82.9739),
('Srinagar','Jammu and Kashmir',34.0837,74.7973),('Amritsar','Punjab',31.6340,74.8723),('Ranchi','Jharkhand',23.3441,85.3096),
('Coimbatore','Tamil Nadu',11.0168,76.9558),('Jabalpur','Madhya Pradesh',23.1815,79.9864),('Gwalior','Madhya Pradesh',26.2183,78.1828),
('Vijayawada','Andhra Pradesh',16.5062,80.6480),('Jodhpur','Rajasthan',26.2389,73.0243),('Madurai','Tamil Nadu',9.9252,78.1198),
('Raipur','Chhattisgarh',21.2514,81.6296),('Kota','Rajasthan',25.2138,75.8648),('Guwahati','Assam',26.1445,91.7362),
('Chandigarh','Chandigarh',30.7333,76.7794),('Mysuru','Karnataka',12.2958,76.6394),('Thiruvananthapuram','Kerala',8.5241,76.9366),
('Kochi','Kerala',9.9312,76.2673),('Bhubaneswar','Odisha',20.2961,85.8245),('Noida','Uttar Pradesh',28.5355,77.3910),
('Gurugram','Haryana',28.4595,77.0266),('Dehradun','Uttarakhand',30.3165,78.0322),('Mangaluru','Karnataka',12.9141,74.8560),
('Tiruchirappalli','Tamil Nadu',10.7905,78.7047),('Hubballi','Karnataka',15.3647,75.1240),('Warangal','Telangana',17.9689,79.5941),
('Guntur','Andhra Pradesh',16.3067,80.4365),('Nellore','Andhra Pradesh',14.4426,79.9865),('Tirupati','Andhra Pradesh',13.6288,79.4192),
('Kozhikode','Kerala',11.2588,75.7804),('Salem','Tamil Nadu',11.6643,78.1460),('Jammu','Jammu and Kashmir',32.7266,74.8570),
('Siliguri','West Bengal',26.7271,88.3953),('Panaji','Goa',15.4909,73.8278),('Udaipur','Rajasthan',24.5854,73.7125),
('Puducherry','Puducherry',11.9416,79.8083),('Prayagraj','Uttar Pradesh',25.4358,81.8463)
) as v(n, s, lat, lng);

-- Owner of every is_demo listing. The .invalid address can never receive mail or sign in.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at, is_anonymous)
values ('00000000-0000-4000-8000-00000000c0c0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'demo@chowk.invalid', '{"full_name":"Chowk Demo"}', now() - interval '400 days', now(), false);
