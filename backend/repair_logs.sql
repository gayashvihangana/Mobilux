-- ============================================================
-- Create repair_logs table
-- ============================================================
CREATE TABLE IF NOT EXISTS repair_logs (
    id              SERIAL PRIMARY KEY,
    rep_id          VARCHAR(20)     NOT NULL,
    owner           VARCHAR(255),
    brand           VARCHAR(100),
    model           VARCHAR(255),
    issue           TEXT,
    solution        TEXT,
    completed       BOOLEAN         DEFAULT false,
    cost            DECIMAL(10,2),
    payment         DECIMAL(10,2),
    profit          DECIMAL(10,2),
    date_completed  DATE,
    duration        VARCHAR(100),
    parts           TEXT,
    shop            TEXT,
    comments        TEXT,
    forgotten_parts TEXT,
    created_at      TIMESTAMP       DEFAULT now(),
    updated_at      TIMESTAMP       DEFAULT now()
);

-- ============================================================
-- Insert all 40 repair records
-- ============================================================
INSERT INTO repair_logs
  (rep_id, owner, brand, model, issue, solution, completed, cost, payment, profit, date_completed, duration, parts, shop, comments, forgotten_parts)
VALUES
('REP-001','Priyantha Bappa','Apple','iPhone 8 Plus','iCloud and Carrier Locked','Bypassed iCloud and Unlocked Carrier Lock',true,12438,15000,2562,'2024-01-10',NULL,NULL,'iRemoval Pro, Phone Style Server',NULL,NULL),
('REP-002','Dishan''s Father',NULL,NULL,'No Signal','Reconnected Antenna',true,0,0,0,'2024-01-17','1 Day',NULL,NULL,NULL,NULL),
('REP-003','Tangalle Phone Shop',NULL,NULL,'Mic Failure','Replaced Mic',true,0,0,0,'2024-01-20','1 Day','Mic','Tangalle Phone Shop',NULL,NULL),
('REP-004','Kurulu Mama','Huawei',NULL,'Speaker Failure','Serviced',true,0,0,0,NULL,'1 Day',NULL,NULL,NULL,NULL),
('REP-005','Basuru','Apple','iPhone X','No Power','Identified Fault',false,0,0,0,'2024-02-01',NULL,NULL,NULL,NULL,NULL),
('REP-006','Basuru','Samsung','Galaxy A51','Insert Sim Error','Serviced',true,0,0,0,'2024-02-05','1 Day',NULL,NULL,NULL,NULL),
('REP-007','Pramith Ayya','Redmi','Note 8','Side Keys Not Functioning','Replaced Side Keys',true,0,1500,1500,NULL,'1 Day','Side Keys',NULL,NULL,NULL),
('REP-008','Punchi Amma','Nokia','2.2','Ghost Touch Issue','Display Replacement',true,4500,6000,1500,'2024-03-19','1 Day','Display','AMS Cellular',NULL,NULL),
('REP-009','Hirusha','Redmi','Note 9s','Side Keys Not Functioning','Replaced Side Keys',true,300,600,300,NULL,'1 Day','Side Keys','Galaxy Mobile Dickwella',NULL,NULL),
('REP-010','Sudu Bappa''s Malli','Apple','iPhone 7','Display Cracked','Display Replacement',true,3500,0,-3500,NULL,'1 Day','Display','AMS Cellular',NULL,NULL),
('REP-011','Priyantha Bappa','Samsung','Galaxy J2','Display Blurred','Display Replacement',true,3300,4000,700,'2024-05-15','1 Day','Display','SP Electronics',NULL,NULL),
('REP-012','Me','Apple','iPhone Xs','Display Cracked','Display Replacement',true,9500,9500,0,'2024-06-28','1 Day','Display','AMS Cellular',NULL,NULL),
('REP-013','Priyantha Bappa','Apple','iPhone 8 Plus','Home Button Failure','Replaced Home Button',true,NULL,NULL,0,NULL,'1 Day','Home Button','Pettah Shop Near Polek',NULL,NULL),
('REP-014','Punchi Amma','Nokia','2.2','Battery Capacity Loss','Replaced Battery',true,1530,2000,470,'2024-07-16','1 Day','Battery','Vancon Cellular',NULL,NULL),
('REP-015','Punchi Thaththa','Samsung','Galaxy Wide 2','Display Cracked','Display Replacement',true,5650,5000,-650,NULL,NULL,'Display','Zoom Mobile Matale',NULL,NULL),
('REP-016','Punchi Thaththa',NULL,NULL,'Battery Drain Issue','Removed Flash Light',false,0,0,0,NULL,'1 Day',NULL,NULL,NULL,NULL),
('REP-017','Buthmi','Huawei',NULL,'No Power','Reconnected Battery Pin',true,0,0,0,NULL,'1 Day',NULL,NULL,NULL,NULL),
('REP-018','Rusira','Redmi','Note 8','Mic Failure','Replaced Charging Flex',true,0,500,500,NULL,NULL,'Charging Flex',NULL,NULL,NULL),
('REP-019','Yasiru Malli','Oppo',NULL,'Display Cracked','Display Replacement',true,NULL,NULL,0,'2024-08-02',NULL,'Display',NULL,NULL,NULL),
('REP-020','Rusira','Redmi','Note 8','Display Cracked','Display Replacement',true,NULL,NULL,0,'2024-08-05','1 Day','Display',NULL,NULL,NULL),
('REP-021','Chali Ayya''s Nanda','Apple','iPhone 13 Pro Max','Yellow Screen Issue','Added Jumper',true,0,10000,10000,'2024-08-09',NULL,NULL,NULL,NULL,NULL),
('REP-022','Basuru','Samsung','Galaxy A12','Display Cracked','Display Replacement',true,2450,5000,2550,'2025-01-07',NULL,'Display','Trans Asia Cellular',NULL,NULL),
('REP-023','Himashi','Samsung','Galaxy A20s','Display Cracked','Display Replacement',true,0,0,0,'2025-02-13','3 Hours','Display','Trans Asia Cellular','Returned on 2026/02/05. The display was separated and not working. After inspection, I found the glue was near its expiry date. When removing it, I found it had hardened into a crystal-like texture, and dust may have mixed with it, causing it to fail.',NULL),
('REP-024','Sudu Amma','Apple','iPhone 8 Plus','Display Glitched','Display Replacement',true,2800,5000,2200,'2025-02-23','2 Hours','Display','Trans Asia Cellular',NULL,NULL),
('REP-025','Punchi Amma','Nokia','2.2','Display Separated','Glued Display',true,0,0,0,'2025-03-10','10 Minutes',NULL,NULL,NULL,NULL),
('REP-026','Nihal Mama','Samsung','Galaxy J2','Power Button doesn''t work, Display Cracked','Power Button Resoldered, Display Replacement',true,2500,0,-2500,'2025-04-18','1 Year','Display',NULL,NULL,NULL),
('REP-027','Ayya','Google','Pixel 6','Battery Swelling','Replaced Battery',true,2200,2200,0,'2025-06-02','1 Day','Battery','SP Electronics',NULL,NULL),
('REP-028','Isuri Akka','Huawei','Y9 2018','Side Keys Not Functioning','Replaced Side Keys',true,200,1500,1300,'2025-06-27','20 Minutes','Side Keys','GSM Father',NULL,NULL),
('REP-029','Raja Mama','Samsung','Galaxy A10s','Display Cracked','Display Replacement',true,2200,5000,2800,'2025-07-08','2 Hours','Display','Trans Asia Cellular',NULL,NULL),
('REP-030','Sisil Ayya','Samsung','Galaxy Grand Prime 4G','Forgotten Screen Lock, Separated Display','FRP Bypass, Glued Display',true,0,1000,1000,'2025-07-08','1 Day',NULL,NULL,NULL,NULL),
('REP-031','Me','Apple','iPhone Xs','Battery Drained','Replaced Battery',true,2800,0,-2800,'2025-09-05','2 Hours','Battery','RS Combo','Forgot to apply the earpiece cover; attempted to reopen the glued display, causing the glass to crack at the top-right corner.','Earpiece Cover'),
('REP-032','Basuru','Samsung','Galaxy A12','Display Cracked','Display Replacement',true,2000,4000,2000,'2025-09-05','1 Hour','Display','Trans Asia Cellular',NULL,NULL),
('REP-033','Sandali Akka','Apple','iPhone 7 Plus','Battery Voltage Loss','Hi-Charged Battery',true,0,0,0,'2025-09-05','15 Minutes',NULL,NULL,NULL,NULL),
('REP-034','Ayya','Google','Pixel 6','Display Cracked','Display Replacement',true,0,0,0,'2025-10-18',NULL,'Display','Trans Asia Cellular','Ayya bought the display in Pettah. On 07.02.2026, Ayya reported that the display''s touch is not working on one side.',NULL),
('REP-035','Dishan','Redmi','9','Display Cracked & Phone Edged','Display Replacement & Middle Housing Structural Correction',true,2250,4000,1750,'2026-01-15','1 Day','Display','Trans Asia Cellular','Learned how to realign middle housing. Done by heating the housing at 135 C temperature and bending by hand.','Fingerprint Pin Cover'),
('REP-036','Renuka Loku Amma','Huawei','Y9 2019','Auto Restart & FRP Locked','FRP Reset, Battery Resistor Jumper',true,900,3600,2700,'2026-01-25','3 Weeks','Back Cover','Pettah Street','Rented Unlock Tool for LKR 500 for 12 hours. Bought Back Cover for LKR 400. After repairing, customer told Mobitel sim signal not working. Remember to tell customer we only provide solutions for asked issues and when unlocking a device, we cannot guarantee there will not be any errors after unlocking.',NULL),
('REP-037','Isuri Akka','Huawei','Y9 2018','Battery Drained','Battery Replacement',true,1800,3000,1200,'2026-01-31','1 Hour','Battery','SP Electronics',NULL,NULL),
('REP-038','Himashi','Samsung','A20S','Display Not Worked','Display Replacement',true,2600,5000,2400,'2026-02-06','1 Hour','Display','SK Lanka Holdings','Glue was applied to the bottom-left and bottom-right sides beneath the display. After the adhesive was applied, some color patches appeared along the edges of the screen and near the upper area. On 11.02.2026, five days later, I followed up with her to check the display. She informed me that the brown color patch had disappeared and that the display was now functioning normally.','3 Screws'),
('REP-039','Mr. Nimal (Nadeeka Timber Stores)','Samsung','M01 Core','Out Keys and SIM Tray Not Available','Out Keys and SIM Tray Placed',true,200,1000,800,'2026-02-12','10 Minutes','Out Keys and SIM Tray','GSM Father and Asha Cellular','The SIM Tray is not well fitting but its almost fitting.',NULL),
('REP-040','Kalshan','Samsung','M01s','Out Keys Damaged','Out Keys Replacement',true,100,400,300,'2026-02-25','10 Minutes','Out Keys','GSM Father',NULL,NULL)
ON CONFLICT DO NOTHING;
